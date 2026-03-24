import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { usePatientRegister } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Leaf,
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Weight,
  Ruler,
  Salad,
  HeartPulse,
  AlertCircle,
  Stethoscope,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useRef } from "react";

interface PatientFormData {
  name: string;
  dateOfBirth: string;
  bloodGroup: string;
  gender: string;
  weight: string;
  height: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  dietaryHabits: string;
  healthGoals: string[];
  allergies: string;
  chronicConditions: string[];
}

interface PatientRegistrationProps {
  onNavigate?: (view: string) => void;
}
export default function PatientRegistration({
  onNavigate,
}: PatientRegistrationProps) {
  const { toast } = useToast();
  const patientRegisterMutation = usePatientRegister();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PatientFormData>({
    name: "",
    dateOfBirth: "",
    bloodGroup: "",
    gender: "",
    weight: "",
    height: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dietaryHabits: "",
    healthGoals: [],
    allergies: "",
    chronicConditions: [],
  });
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;
  const formRef = useRef<HTMLDivElement>(null);

  const validateCurrentStep = () => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.name.trim()) errors.name = "Full name is required";

      if (!formData.dateOfBirth) {
        errors.dateOfBirth = "Date of birth is required";
      } else {
        const dob = new Date(formData.dateOfBirth);
        const today = new Date();
        if (Number.isNaN(dob.getTime())) {
          errors.dateOfBirth = "Enter a valid date of birth";
        } else if (dob > today) {
          errors.dateOfBirth = "Date of birth cannot be in the future";
        }
      }

      if (!formData.bloodGroup) errors.bloodGroup = "Blood group is required";

      if (!formData.gender) errors.gender = "Gender is required";

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim()) {
        errors.email = "Email is required";
      } else if (!emailRegex.test(formData.email.trim())) {
        errors.email = "Enter a valid email address";
      }

      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (!formData.phone.trim()) {
        errors.phone = "Phone number is required";
      } else if (phoneDigits.length < 10) {
        errors.phone = "Phone number must be at least 10 digits";
      }

      if (!formData.password) {
        errors.password = "Password is required";
      } else if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = "Confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }

    if (currentStep === 2) {
      const weightValue = Number(formData.weight);
      const heightValue = Number(formData.height);

      if (!formData.weight || Number.isNaN(weightValue) || weightValue <= 0) {
        errors.weight = "Valid weight is required";
      }

      if (!formData.height || Number.isNaN(heightValue) || heightValue <= 0) {
        errors.height = "Valid height is required";
      }

      if (!formData.dietaryHabits) {
        errors.dietaryHabits = "Dietary preference is required";
      }
    }

    if (currentStep === 3) {
      if (formData.healthGoals.length === 0) {
        errors.healthGoals = "Select at least one health goal";
      }
    }

    if (currentStep === 4) {
      if (formData.chronicConditions.length === 0) {
        errors.chronicConditions = "Select at least one option";
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      patientRegisterMutation.mutate(
        {
          name: formData.name.trim(),
          dateOfBirth: formData.dateOfBirth,
          bloodGroup: formData.bloodGroup,
          gender: formData.gender,
          weight: Number(formData.weight),
          height: Number(formData.height),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phone: formData.phone.trim(),
          dietaryHabits: formData.dietaryHabits,
          healthGoals: formData.healthGoals,
          allergies: formData.allergies,
          chronicConditions: formData.chronicConditions,
        },
        {
          onSuccess: (data: any) => {
            if (data?.user?.id) {
              localStorage.setItem(
                "triveda_user",
                JSON.stringify({ ...data.user, portal: "PATIENT", role: "PATIENT" })
              );
            }
            toast({
              title: "Registration Successful",
              description: "Your account has been created. Proceed to assessment.",
            });
            setShowSuccess(true);
          },
        },
      );
    }
  };

  // Handles navigation for assessment
  const handleGoToAssessment = () => {
    if (onNavigate) {
      onNavigate("prakriti-assessment");
    } else {
      setLocation("/patient/assessment");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setStepErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const handleArrayToggle = (
    field: "healthGoals" | "chronicConditions",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
    setStepErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-1 mb-1">
                  <UserPlus className="w-4 h-4 text-muted-foreground" /> Full
                  Name *
                </Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter your full name"
                />
                {stepErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{stepErrors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="dateOfBirth" className="flex items-center gap-1 mb-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" /> Date of Birth *
                </Label>
                <Input
                  id="dateOfBirth"
                  data-testid="input-date-of-birth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) =>
                    handleInputChange("dateOfBirth", e.target.value)
                  }
                />
                {stepErrors.dateOfBirth && (
                  <p className="text-xs text-red-500 mt-1">{stepErrors.dateOfBirth}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="bloodGroup" className="flex items-center gap-1 mb-1">
                <HeartPulse className="w-4 h-4 text-muted-foreground" /> Blood Group *
              </Label>
              <Select
                onValueChange={(value) => handleInputChange("bloodGroup", value)}
                value={formData.bloodGroup}
              >
                <SelectTrigger data-testid="select-blood-group">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
              {stepErrors.bloodGroup && (
                <p className="text-xs text-red-500 mt-1">{stepErrors.bloodGroup}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="flex items-center gap-1 mb-1">
                  <Mail className="w-4 h-4 text-muted-foreground" /> Email *
                </Label>
                <Input
                  id="email"
                  data-testid="input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                />
                {stepErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{stepErrors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone" className="flex items-center gap-1 mb-1">
                  <Phone className="w-4 h-4 text-muted-foreground" /> Phone
                  Number *
                </Label>
                <Input
                  id="phone"
                  data-testid="input-phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
                {stepErrors.phone && (
                  <p className="text-xs text-red-500 mt-1">{stepErrors.phone}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password" className="flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Password *
                </Label>
                <Input
                  id="password"
                  data-testid="input-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Minimum 8 characters"
                />
                {stepErrors.password && (
                  <p className="text-xs text-red-500 mt-1">{stepErrors.password}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirm-password" className="flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Confirm Password *
                </Label>
                <Input
                  id="confirm-password"
                  data-testid="input-confirm-password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  placeholder="Re-enter your password"
                />
                {stepErrors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{stepErrors.confirmPassword}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="gender" className="flex items-center gap-1 mb-1">
                <UserCheck className="w-4 h-4 text-muted-foreground" /> Gender *
              </Label>
              <Select
                onValueChange={(value) => handleInputChange("gender", value)}
                value={formData.gender}
              >
                <SelectTrigger data-testid="select-gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {stepErrors.gender && (
                <p className="text-xs text-red-500 mt-1">{stepErrors.gender}</p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-primary" /> Physical
              Characteristics
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="weight"
                  className="flex items-center gap-1 mb-1"
                >
                  <Weight className="w-4 h-4 text-muted-foreground" /> Weight
                  (kg) *
                </Label>
                <Input
                  id="weight"
                  data-testid="input-weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  placeholder="70.5"
                />
                {stepErrors.weight && (
                  <p className="text-xs text-red-500 mt-1">{stepErrors.weight}</p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="height"
                  className="flex items-center gap-1 mb-1"
                >
                  <Ruler className="w-4 h-4 text-muted-foreground" /> Height
                  (cm) *
                </Label>
                <Input
                  id="height"
                  data-testid="input-height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                  placeholder="170"
                />
                {stepErrors.height && (
                  <p className="text-xs text-red-500 mt-1">{stepErrors.height}</p>
                )}
              </div>
            </div>
            {formData.weight && formData.height && (
              <div className="bg-muted p-4 rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <p className="text-sm text-muted-foreground">
                  Calculated BMI:{" "}
                  {(
                    parseFloat(formData.weight) /
                    Math.pow(parseFloat(formData.height) / 100, 2)
                  ).toFixed(1)}
                </p>
              </div>
            )}
            <div>
              <Label
                htmlFor="dietaryHabits"
                className="flex items-center gap-1 mb-1"
              >
                <Salad className="w-4 h-4 text-muted-foreground" /> Dietary
                Habits
              </Label>
              <Select
                onValueChange={(value) =>
                  handleInputChange("dietaryHabits", value)
                }
                value={formData.dietaryHabits}
              >
                <SelectTrigger data-testid="select-diet">
                  <SelectValue placeholder="Select dietary preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="non-vegetarian">Non-Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="eggetarian">Eggetarian</SelectItem>
                </SelectContent>
              </Select>
              {stepErrors.dietaryHabits && (
                <p className="text-xs text-red-500 mt-1">{stepErrors.dietaryHabits}</p>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" /> Health Goals &
              Preferences
            </h3>
            <div>
              <Label className="text-base font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />{" "}
                Health Goals (Select all that apply)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {[
                  "Weight Loss",
                  "Weight Gain",
                  "Better Digestion",
                  "Improved Energy",
                  "Skin Health",
                  "Stress Management",
                  "Sleep Quality",
                  "General Wellness",
                ].map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal}
                      data-testid={`checkbox-goal-${goal
                        .toLowerCase()
                        .replace(/ /g, "-")}`}
                      checked={formData.healthGoals.includes(goal)}
                      onCheckedChange={() =>
                        handleArrayToggle("healthGoals", goal)
                      }
                    />
                    <Label htmlFor={goal} className="text-sm">
                      {goal}
                    </Label>
                  </div>
                ))}
              </div>
              {stepErrors.healthGoals && (
                <p className="text-xs text-red-500 mt-2">{stepErrors.healthGoals}</p>
              )}
            </div>
            <div>
              <Label
                htmlFor="allergies"
                className="flex items-center gap-1 mb-1"
              >
                <AlertCircle className="w-4 h-4 text-muted-foreground" /> Known
                Allergies
              </Label>
              <Input
                id="allergies"
                data-testid="input-allergies"
                value={formData.allergies}
                onChange={(e) => handleInputChange("allergies", e.target.value)}
                placeholder="e.g., Peanuts, Dairy, Gluten (leave blank if none)"
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" /> Medical History
            </h3>
            <div>
              <Label className="text-base font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />{" "}
                Chronic Conditions (Select all that apply)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {[
                  "Diabetes",
                  "Hypertension",
                  "Heart Disease",
                  "Thyroid Issues",
                  "PCOD/PCOS",
                  "Arthritis",
                  "Digestive Issues",
                  "None",
                ].map((condition) => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox
                      id={condition}
                      data-testid={`checkbox-condition-${condition
                        .toLowerCase()
                        .replace(/\//g, "-")
                        .replace(/ /g, "-")}`}
                      checked={formData.chronicConditions.includes(condition)}
                      onCheckedChange={() =>
                        handleArrayToggle("chronicConditions", condition)
                      }
                    />
                    <Label htmlFor={condition} className="text-sm">
                      {condition}
                    </Label>
                  </div>
                ))}
              </div>
              {stepErrors.chronicConditions && (
                <p className="text-xs text-red-500 mt-2">{stepErrors.chronicConditions}</p>
              )}
            </div>
            <div className="bg-primary/5 p-4 rounded-lg flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" />
              <p className="text-sm text-muted-foreground">
                <strong>Next Step:</strong> After registration, you'll complete
                a constitutional assessment (Prakriti quiz) to determine your
                Ayurvedic body type for personalized diet recommendations.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 opacity-10 animate-pulse"></div>
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-emerald-200/20 animate-bounce">
          <Leaf size={40} />
        </div>
        <div className="absolute top-40 right-20 text-teal-300/20 animate-pulse">
          <HeartPulse size={32} />
        </div>
        <div
          className="absolute bottom-32 left-20 text-cyan-200/20 animate-bounce"
          style={{ animationDelay: "1s" }}
        >
          <User size={36} />
        </div>
        <div
          className="absolute bottom-20 right-10 text-emerald-300/20 animate-pulse"
          style={{ animationDelay: "0.5s" }}
        >
          <Salad size={44} />
        </div>
      </div>
      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <Card className="w-full max-w-2xl backdrop-blur-sm bg-white/95 shadow-2xl border border-white/20 overflow-hidden animate-fade-in">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 mr-3">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-wide">
                    TrivedaCare
                  </h1>
                  <p className="text-xs text-white/80 font-medium">
                    Ayurvedic Wellness Platform
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-white/15 backdrop-blur-sm rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-1">
                  Sacred Patient Registration
                </h2>
                <p className="text-sm text-white/90 font-medium">
                  Step {currentStep} of {totalSteps}: Complete your profile for
                  personalized Ayurvedic care
                </p>
              </div>
            </div>
            {/* Decorative wave */}
            <div className="absolute bottom-0 left-0 right-0 h-4">
              <svg
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                <path
                  d="M0,60 C300,120 900,0 1200,60 L1200,120 L0,120 Z"
                  fill="white"
                  opacity="0.1"
                />
              </svg>
            </div>
          </div>
          <CardContent ref={formRef} className="p-8">
            <Progress value={progress} className="w-full mt-2 mb-6" />
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] animate-fade-in">
                <CheckCircle2 className="w-16 h-16 text-emerald-600 mb-4 animate-bounce-in" />
                <h2 className="text-xl font-semibold mb-2 text-emerald-700">
                  Submitted for Assessment!
                </h2>
                <p className="text-base text-muted-foreground mb-4 text-center max-w-md">
                  Thank you for completing your registration.
                  <br />
                  <span className="text-primary font-medium">
                    You may now proceed to your Prakriti Assessment.
                  </span>
                </p>
                <Button
                  className="mt-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 text-white font-semibold rounded-lg shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-300"
                  variant="default"
                  onClick={handleGoToAssessment}
                  data-testid="button-proceed-assessment"
                >
                  <ArrowRight className="w-4 h-4 mr-2" /> Go to Assessment
                </Button>
              </div>
            ) : (
              <>
                {renderStep()}
                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    data-testid="button-back"
                    className="flex items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg font-medium"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={patientRegisterMutation.isPending}
                    data-testid="button-next"
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 text-white font-semibold rounded-lg shadow-lg hover:opacity-90 hover:scale-[1.02] transition-all duration-300"
                  >
                    {currentStep === totalSteps ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {patientRegisterMutation.isPending
                          ? "Submitting..."
                          : "Complete Registration"}
                      </>
                    ) : (
                      <>
                        Next <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
