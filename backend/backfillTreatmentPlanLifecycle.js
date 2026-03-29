import "dotenv/config";
import { prisma } from "./src/db/config.js";

const VALID_STATUS = new Set([
  "ACTIVE",
  "WORKING",
  "NOT_EFFECTIVE",
  "STOP_REQUESTED",
  "STOPPED",
  "COMPLETED",
  "SUPERSEDED",
]);

const DOMAIN_TO_ENUM = {
  diet: "DIET",
  asanas: "ASANAS",
  medicines: "MEDICINES",
};

const FEEDBACK_TO_ENUM = {
  working: "WORKING",
  not_effective: "NOT_EFFECTIVE",
  terminate_request: "TERMINATE_REQUEST",
  stopped: "STOPPED",
};

const normalizeStatus = (value, fallback = "ACTIVE") => {
  const status = String(value || "").trim().toUpperCase();
  return VALID_STATUS.has(status) ? status : fallback;
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toObject = (value) => (value && typeof value === "object" ? value : {});

const toDomainConfig = (raw) => {
  const source = toObject(raw);
  const cadence = Number(source.reviewCadenceDays);
  return {
    status: normalizeStatus(source.status, "ACTIVE"),
    stopConditions: source.stopConditions ? String(source.stopConditions) : null,
    reviewCadenceDays: Number.isFinite(cadence) && cadence > 0 ? Math.trunc(cadence) : null,
    patientGuidance: source.patientGuidance ? String(source.patientGuidance) : null,
  };
};

const getLegacyLifecycle = (plan) => {
  const diagnosis = toObject(plan.diagnosis);
  const lifecycle = toObject(diagnosis.planLifecycle);
  if (!Object.keys(lifecycle).length) return null;

  return {
    effectiveFrom: parseDateOrNull(lifecycle.effectiveFrom),
    effectiveTo: parseDateOrNull(lifecycle.effectiveTo),
    overallStatus: normalizeStatus(lifecycle.overallStatus, plan.isCompleted ? "COMPLETED" : "ACTIVE"),
    feedbackSettings: toObject(lifecycle.feedbackSettings),
    diet: toDomainConfig(lifecycle.diet),
    asanas: toDomainConfig(lifecycle.asanas),
    medicines: toDomainConfig(lifecycle.medicines),
    feedbackEvents: Array.isArray(lifecycle.feedbackEvents) ? lifecycle.feedbackEvents : [],
  };
};

const getEventDate = (event, fallbackDate) => {
  const parsed = parseDateOrNull(event?.createdAt);
  return parsed || fallbackDate;
};

const main = async () => {
  const args = process.argv.slice(2);
  const bootstrapMode = args.includes("--bootstrap");

  const treatmentPlans = await prisma.treatmentPlan.findMany({
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      appointmentId: true,
      isCompleted: true,
      createdAt: true,
      diagnosis: true,
      lifecycle: {
        select: {
          id: true,
          feedbackEvents: {
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  let scanned = 0;
  let skippedNoLegacy = 0;
  let lifecycleUpserts = 0;
  let domainUpserts = 0;
  let feedbackInserted = 0;
  let skippedFeedbackExisting = 0;
  let bootstrapCreated = 0;

  for (const plan of treatmentPlans) {
    scanned += 1;

    const legacy = getLegacyLifecycle(plan);
    if (!legacy) {
      if (!bootstrapMode) {
        skippedNoLegacy += 1;
        continue;
      }

      const lifecycleRecord = await prisma.treatmentPlanLifecycle.upsert({
        where: { treatmentPlanId: plan.id },
        create: {
          treatmentPlanId: plan.id,
          effectiveFrom: null,
          effectiveTo: null,
          overallStatus: plan.isCompleted ? "COMPLETED" : "ACTIVE",
          notifyOnWorking: true,
          notifyOnNotEffective: true,
          notifyOnTerminateRequest: true,
        },
        update: {
          overallStatus: plan.isCompleted ? "COMPLETED" : "ACTIVE",
        },
        select: { id: true },
      });
      lifecycleUpserts += 1;

      for (const key of ["diet", "asanas", "medicines"]) {
        await prisma.treatmentPlanDomainConfig.upsert({
          where: {
            lifecycleId_domain: {
              lifecycleId: lifecycleRecord.id,
              domain: DOMAIN_TO_ENUM[key],
            },
          },
          create: {
            lifecycleId: lifecycleRecord.id,
            domain: DOMAIN_TO_ENUM[key],
            status: "ACTIVE",
            stopConditions: null,
            reviewCadenceDays: null,
            patientGuidance: null,
          },
          update: {},
        });
        domainUpserts += 1;
      }
      bootstrapCreated += 1;
      continue;
    }

    const lifecycleRecord = await prisma.treatmentPlanLifecycle.upsert({
      where: { treatmentPlanId: plan.id },
      create: {
        treatmentPlanId: plan.id,
        effectiveFrom: legacy.effectiveFrom,
        effectiveTo: legacy.effectiveTo,
        overallStatus: legacy.overallStatus,
        notifyOnWorking: legacy.feedbackSettings.notifyOnWorking !== false,
        notifyOnNotEffective: legacy.feedbackSettings.notifyOnNotEffective !== false,
        notifyOnTerminateRequest: legacy.feedbackSettings.notifyOnTerminateRequest !== false,
      },
      update: {
        effectiveFrom: legacy.effectiveFrom,
        effectiveTo: legacy.effectiveTo,
        overallStatus: legacy.overallStatus,
        notifyOnWorking: legacy.feedbackSettings.notifyOnWorking !== false,
        notifyOnNotEffective: legacy.feedbackSettings.notifyOnNotEffective !== false,
        notifyOnTerminateRequest: legacy.feedbackSettings.notifyOnTerminateRequest !== false,
      },
      select: {
        id: true,
      },
    });
    lifecycleUpserts += 1;

    for (const key of ["diet", "asanas", "medicines"]) {
      await prisma.treatmentPlanDomainConfig.upsert({
        where: {
          lifecycleId_domain: {
            lifecycleId: lifecycleRecord.id,
            domain: DOMAIN_TO_ENUM[key],
          },
        },
        create: {
          lifecycleId: lifecycleRecord.id,
          domain: DOMAIN_TO_ENUM[key],
          status: legacy[key].status,
          stopConditions: legacy[key].stopConditions,
          reviewCadenceDays: legacy[key].reviewCadenceDays,
          patientGuidance: legacy[key].patientGuidance,
        },
        update: {
          status: legacy[key].status,
          stopConditions: legacy[key].stopConditions,
          reviewCadenceDays: legacy[key].reviewCadenceDays,
          patientGuidance: legacy[key].patientGuidance,
        },
      });
      domainUpserts += 1;
    }

    const hasAnyPersistedFeedback = Boolean(plan.lifecycle?.feedbackEvents?.length);
    if (hasAnyPersistedFeedback) {
      skippedFeedbackExisting += legacy.feedbackEvents.length;
      continue;
    }

    for (const event of legacy.feedbackEvents) {
      const planType = DOMAIN_TO_ENUM[String(event?.planType || "").toLowerCase()];
      const feedbackType = FEEDBACK_TO_ENUM[String(event?.feedbackType || "").toLowerCase()];
      if (!planType || !feedbackType) continue;

      await prisma.treatmentPlanFeedback.create({
        data: {
          lifecycleId: lifecycleRecord.id,
          treatmentPlanId: plan.id,
          appointmentId: plan.appointmentId || null,
          patientId: plan.patientId,
          doctorId: plan.doctorId,
          planType,
          feedbackType,
          message: event?.message ? String(event.message) : null,
          readByDoctor: Boolean(event?.readByDoctor),
          createdAt: getEventDate(event, plan.createdAt),
        },
      });
      feedbackInserted += 1;
    }
  }

  console.log("Treatment lifecycle backfill summary:");
  console.log(`- Plans scanned: ${scanned}`);
  if (!bootstrapMode) {
    console.log(`- Skipped (no legacy lifecycle): ${skippedNoLegacy}`);
  }
  console.log(`- Lifecycle rows upserted: ${lifecycleUpserts}`);
  console.log(`- Domain rows upserted: ${domainUpserts}`);
  console.log(`- Feedback rows inserted: ${feedbackInserted}`);
  if (bootstrapMode) {
    console.log(`- Bootstrap default lifecycle created: ${bootstrapCreated}`);
  } else {
    console.log(`- Legacy feedback skipped (already persisted): ${skippedFeedbackExisting}`);
  }
  console.log(`\n✅ Lifecycle backfill complete. Run with --bootstrap to create defaults for plans without legacy data.`);
};

main()
  .catch((error) => {
    console.error("Lifecycle backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
