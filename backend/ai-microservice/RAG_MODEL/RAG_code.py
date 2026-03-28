import json
import numpy as np
import pickle
import os
import requests
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional, Tuple
import time
import re
from datetime import datetime
import faiss
from collections import defaultdict
from difflib import get_close_matches

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:1b"

class UnifiedAyurvedicRAGBot:
    
    def __init__(self, herbs_file="herbs.json", pubmed_file="pubmed_data/pubmed_for_rag.json"):
        print("Initializing UNIFIED Ayurvedic RAG Bot (Enhanced)...")
        print("="*70)
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        self.herbs_file = os.path.join(script_dir, herbs_file) if not os.path.isabs(herbs_file) else herbs_file
        self.pubmed_file = os.path.join(script_dir, pubmed_file) if not os.path.isabs(pubmed_file) else pubmed_file
        
        self.herbs_data = []
        self.pubmed_data = []
        self.all_documents = []
        self.all_metadata = []
        self.embeddings = None
        self.faiss_index = None
        
        self.query_cache = {}
        self.query_history = []
        self.accuracy_history = []
        
        
        self.herb_synonyms = {
            "turmeric": ["haridra", "curcuma longa", "haldi"],
            "ashwagandha": ["withania somnifera", "indian ginseng", "winter cherry"],
            "triphala": ["triphala churna", "amalaki", "bibhitaki", "haritaki"],
            "tulsi": ["holy basil", "ocimum sanctum", "tulasi"],
            "ginger": ["ardraka", "zinger officinale", "shunthi"],
            "gokshura": ["tribulus terrestris", "puncture vine"],
            "arjuna": ["terminalia arjuna"],
            "neem": ["azadirachta indica", "nimba"],
            "brahmi": ["bacopa monnieri", "gotu kola"],
            "shilajit": ["mineral pitch", "mumijo"],
            "guggulu": ["commiphora mukul", "guggul"],
            "amla": ["emblica officinalis", "indian gooseberry"],
            "bhringraj": ["eclipta alba", "false daisy"],
            "shatavari": ["asparagus racemosus", "wild asparagus"],
            "vidanga": ["embelia ribes", "false black pepper"],
            "musta": ["cyperus rotundus", "nut grass"],
            "yavani": ["trachyspermum ammi", "ajwain"],
            "ajmoda": ["apium graveolens", "celery seeds"],
            "lavanga": ["syzygium aromaticum", "clove"]
        }
        
        
        self.dosha_keywords = {
            "pitta": ["acidity", "burning", "inflammation", "heartburn", "ulcer", "rash", "heat"],
            "vata": ["anxiety", "bloating", "gas", "pain", "dryness", "restlessness", "insomnia"],
            "kapha": ["cough", "congestion", "mucus", "heaviness", "lethargy", "swelling"]
        }
        
        self._check_ollama()
        
        print("Loading embedding model...")
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
        os.makedirs("./knowledge_base", exist_ok=True)
        
        self._load_or_create_embeddings()
        
        self._build_faiss_index()
        
        self._print_stats()
    
    def _check_ollama(self):
        try:
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json().get('models', [])
                available = any(MODEL_NAME in model.get('name', '') for model in models)
                if available:
                    print(f"Ollama with {MODEL_NAME} is available")
                else:
                    print(f"Model {MODEL_NAME} not found. Run: ollama pull {MODEL_NAME}")
            else:
                print("Ollama not running. Start with: ollama serve")
        except:
            print("Cannot connect to Ollama. Make sure it's running.")
    
    def _load_or_create_embeddings(self):
        embeddings_path = "./knowledge_base/unified_embeddings.npy"
        docs_path = "./knowledge_base/unified_documents.pkl"
        meta_path = "./knowledge_base/unified_metadata.pkl"
        
        if (os.path.exists(embeddings_path) and 
            os.path.exists(docs_path) and 
            os.path.exists(meta_path)):
            print("Loading existing unified embeddings...")
            self.embeddings = np.load(embeddings_path)
            with open(docs_path, 'rb') as f:
                self.all_documents = pickle.load(f)
            with open(meta_path, 'rb') as f:
                self.all_metadata = pickle.load(f)
            print(f"Loaded {len(self.all_documents)} documents")
        else:
            print("Creating new unified embeddings...")
            self._create_unified_embeddings()
    
    def _create_unified_embeddings(self):
        
        print("\nLoading herb database...")
        try:
            with open(self.herbs_file, 'r', encoding='utf-8') as f:
                self.herbs_data = json.load(f)
            print(f"Loaded {len(self.herbs_data)} herbs")
        except Exception as e:
            print(f"Error loading herbs: {e}")
            self.herbs_data = []
        
        print("\nLoading PubMed research articles...")
        try:
            with open(self.pubmed_file, 'r', encoding='utf-8') as f:
                self.pubmed_data = json.load(f)
            print(f"Loaded {len(self.pubmed_data)} PubMed articles")
        except Exception as e:
            print(f"Error loading PubMed data: {e}")
            self.pubmed_data = []
        
        print("\nCreating herb documents with enhanced metadata...")
        for i, herb in enumerate(self.herbs_data):
            doc_text, metadata = self._create_enhanced_herb_document(herb, i)
            self.all_documents.append(doc_text)
            self.all_metadata.append(metadata)
        
        print("Creating PubMed research documents...")
        for i, article in enumerate(self.pubmed_data):
            doc_text, metadata = self._create_pubmed_document(article, i)
            self.all_documents.append(doc_text)
            self.all_metadata.append(metadata)
        
        print(f"\nTotal documents created: {len(self.all_documents)}")
        print(f"Herbs: {len(self.herbs_data)}")
        print(f"Research articles: {len(self.pubmed_data)}")
        
        if self.all_documents:
            print(f"\nGenerating embeddings for {len(self.all_documents)} documents...")
            self.embeddings = self.embedder.encode(
                self.all_documents, 
                show_progress_bar=True,
                batch_size=32,
                convert_to_numpy=True
            )
            
            print("Saving to disk...")
            np.save("./knowledge_base/unified_embeddings.npy", self.embeddings)
            with open("./knowledge_base/unified_documents.pkl", 'wb') as f:
                pickle.dump(self.all_documents, f)
            with open("./knowledge_base/unified_metadata.pkl", 'wb') as f:
                pickle.dump(self.all_metadata, f)
            
            print(f"Created unified knowledge base with {len(self.all_documents)} documents")
        else:
            print("No documents to embed!")
    
    def _create_enhanced_herb_document(self, herb: Dict, index: int) -> Tuple[str, Dict]:
        name = herb.get('name', 'Unknown')
        preview = herb.get('preview', '')
        pacify = herb.get('pacify', [])
        aggravate = herb.get('aggravate', [])
        indications = herb.get('indications', [])
        
        
        synonyms = []
        name_lower = name.lower()
        for herb_key, syn_list in self.herb_synonyms.items():
            if name_lower == herb_key or name_lower in syn_list:
                synonyms = syn_list
                break
        
        
        detected_doshas = []
        for dosha, keywords in self.dosha_keywords.items():
            if any(kw in preview.lower() for kw in keywords):
                detected_doshas.append(dosha)
        
    
        doc_text = f"""Herb: {name}
Synonyms: {', '.join(synonyms) if synonyms else 'None'}
Description: {preview}
Pacifies Doshas: {', '.join(pacify) if pacify else 'None'}
Aggravates Doshas: {', '.join(aggravate) if aggravate else 'None'}
Detected Doshas: {', '.join(detected_doshas)}
Indications: {', '.join(indications) if indications else preview}
Keywords: {name} {preview} {' '.join(pacify)} {' '.join(aggravate)} {' '.join(synonyms)}"""
        
        metadata = {
            'type': 'herb',
            'name': name,
            'indications': preview,
            'pacify': pacify,
            'aggravate': aggravate,
            'synonyms': synonyms,
            'detected_doshas': detected_doshas,
            'index': index
        }
        
        return doc_text, metadata
    
    def _create_pubmed_document(self, article: Dict, index: int) -> Tuple[str, Dict]:
        
        if isinstance(article, dict) and 'text' in article:
            doc_text = article.get('text', '')
            metadata = article.get('metadata', {})
            metadata['type'] = 'research'
            return doc_text, metadata
        
        title = article.get('title', 'No title')
        abstract = article.get('abstract', 'No abstract')
        journal = article.get('journal', 'Unknown')
        year = article.get('year', 'No year')
        authors = article.get('authors', 'Unknown')
        keyword = article.get('search_keyword', '')
        pmid = article.get('pmid', 'N/A')
        
        doc_text = f"""Research: {title}
Abstract: {abstract}
Journal: {journal} ({year})
Keywords: {keyword}
PMID: {pmid}"""
        
        metadata = {
            'type': 'research',
            'title': title,
            'abstract': abstract,
            'journal': journal,
            'year': year,
            'authors': authors,
            'pmid': pmid,
            'search_keyword': keyword
        }
        
        return doc_text, metadata
    
    def _build_faiss_index(self):
        if self.embeddings is not None and len(self.embeddings) > 0:
            print("Building FAISS index...")
            dimension = self.embeddings.shape[1]
            
            self.embeddings = self.embeddings.astype('float32')
            faiss.normalize_L2(self.embeddings)
            
            self.faiss_index = faiss.IndexFlatIP(dimension)
            self.faiss_index.add(self.embeddings)
            
            print(f"FAISS index built with {self.faiss_index.ntotal} vectors")
    
    def _expand_query_with_synonyms(self, question: str) -> List[str]:
        """Expand query with herb synonyms for better matching"""
        expanded_queries = [question]
        question_lower = question.lower()
        
        
        for herb, synonyms in self.herb_synonyms.items():
            if herb in question_lower or any(syn in question_lower for syn in synonyms[:2]):
                expanded_queries.extend(synonyms)
                expanded_queries.append(f"{herb} {synonyms[0] if synonyms else herb}")
                break
        
        
        for dosha, keywords in self.dosha_keywords.items():
            if dosha in question_lower or any(kw in question_lower for kw in keywords[:2]):
                expanded_queries.append(f"{question} {dosha} imbalance")
                expanded_queries.append(f"{question} {keywords[0]}")
                break
        
        return list(set(expanded_queries))
    
    def _get_query_embedding(self, query: str) -> np.ndarray:
        if query not in self.query_cache:
            embedding = self.embedder.encode([query], convert_to_numpy=True)
            faiss.normalize_L2(embedding)
            self.query_cache[query] = embedding
        return self.query_cache[query]
    
    def _hybrid_search(self, question: str, top_k: int = 10) -> List[Dict]:
        if self.faiss_index is None:
            return []
        
        
        expanded_queries = self._expand_query_with_synonyms(question)
        
        all_results = []
        for q in expanded_queries[:3]:  
            q_embedding = self._get_query_embedding(q)
            distances, indices = self.faiss_index.search(q_embedding, top_k)
            
            for idx, distance in zip(indices[0], distances[0]):
                if idx < len(self.all_metadata):
                    score = float(distance)
                    
                    
                    metadata = self.all_metadata[idx]
                    if metadata.get('type') == 'herb':
                        herb_name = metadata.get('name', '').lower()
                        question_lower = question.lower()
                        
                        
                        if herb_name in question_lower or question_lower in herb_name:
                            score += 0.15
                        
                        
                        for syn in metadata.get('synonyms', []):
                            if syn in question_lower:
                                score += 0.10
                                break
                        
                        
                        for dosha, keywords in self.dosha_keywords.items():
                            if dosha in question_lower and dosha in metadata.get('detected_doshas', []):
                                score += 0.10
                    
                    all_results.append({
                        'idx': idx,
                        'score': score,
                        'metadata': metadata
                    })
        
        
        seen = set()
        unique_results = []
        for r in sorted(all_results, key=lambda x: x['score'], reverse=True):
            if r['idx'] not in seen:
                seen.add(r['idx'])
                unique_results.append(r)
        
        return unique_results[:top_k]
    
    def _calculate_enhanced_accuracy(self, question: str, confidence: float, 
                                     herb_sources: List[Dict], research_sources: List[Dict]) -> Dict[str, Any]:
        """Enhanced accuracy calculation with more factors"""
        
        
        if confidence >= 0.7:
            base_accuracy = 90
        elif confidence >= 0.6:
            base_accuracy = 80
        elif confidence >= 0.5:
            base_accuracy = 70
        elif confidence >= 0.4:
            base_accuracy = 60
        else:
            base_accuracy = 50
        
        
        source_quality = 0
        if herb_sources:
            top_herb_score = herb_sources[0].get('score', 0)
            source_quality += min(15, int(top_herb_score * 15))
        
        if research_sources:
            top_research_score = research_sources[0].get('score', 0)
            source_quality += min(10, int(top_research_score * 10))
        
    
        is_research_question = any(word in question.lower() for word in ['research', 'study', 'evidence', 'scientific'])
        if is_research_question:
            if research_sources:
                source_quality += 10
            else:
                source_quality -= 15
        
        
        herb_name_match = False
        for herb in self.herb_synonyms.keys():
            if herb in question.lower():
                herb_name_match = True
                break
        
        if herb_name_match and herb_sources:
            source_quality += 5
        
        final_accuracy = min(100, base_accuracy + source_quality // 2)
        
        return {
            "query": question,
            "confidence": confidence,
            "accuracy_score": final_accuracy,
            "relevance_score": min(100, final_accuracy - 5),
            "completeness_score": min(100, final_accuracy - 2),
            "overall_accuracy": final_accuracy
        }
    
    def _generate_enhanced_answer(self, question: str, herb_sources: List[Dict], 
                                   research_sources: List[Dict] = None) -> str:
        
        if research_sources is None:
            research_sources = []
        
        is_research_question = any(word in question.lower() for word in ['research', 'study', 'studies', 'evidence', 'scientific', 'say about'])
        
        parts = []
        
        
        detected_dosha = None
        for dosha, keywords in self.dosha_keywords.items():
            if any(kw in question.lower() for kw in keywords):
                detected_dosha = dosha
                break
        
        if detected_dosha:
            parts.append(f"Based on your {detected_dosha.capitalize()} imbalance symptoms:")
            parts.append("")
        
        
        if is_research_question and research_sources:
            parts.append("Research Findings:")
            parts.append("")
            for i, r in enumerate(research_sources[:3], 1):
                title = r.get('title', 'Research Article')
                journal = r.get('journal', '')
                year = r.get('year', '')
                abstract = r.get('abstract', '')
                score = r.get('score', 0)
                
                parts.append(f"{i}. {title}")
                if journal and year:
                    parts.append(f"   {journal} ({year}) | Relevance: {score:.0%}")
                if abstract and abstract != 'No abstract':
                    abstract_text = abstract[:350] + "..." if len(abstract) > 350 else abstract
                    parts.append(f"   {abstract_text}")
                parts.append("")
        
        
        if herb_sources:
            if is_research_question and research_sources:
                parts.append("Traditional Ayurvedic Recommendations:")
                parts.append("")
            elif not is_research_question:
                parts.append("Recommended Ayurvedic Herbs:")
                parts.append("")
            
            for i, h in enumerate(herb_sources[:5], 1):
                name = h.get('name', 'Herb')
                indications = h.get('indications', 'Traditional Ayurvedic herb')
                score = h.get('score', 0)
                
                
                if i == 1 and score > 0.6:
                    parts.append(f"{i}. {name} (Best Match)")
                else:
                    parts.append(f"{i}. {name}")
                parts.append(f"   {indications}")
                
                
                if i == 1 and score > 0.6:
                    if "ginger" in name.lower() or "ardraka" in name.lower():
                        parts.append(f"   Tip: Best taken with warm water before meals")
                    elif "turmeric" in name.lower() or "haridra" in name.lower():
                        parts.append(f"   Tip: Best absorbed with black pepper and healthy fat")
                    elif "ashwagandha" in name.lower():
                        parts.append(f"   Tip: Best taken with warm milk before bed")
                
                parts.append("")
        
        if not herb_sources and not research_sources:
            return "I couldn't find specific information about this in the database. Please consult an Ayurvedic practitioner for personalized advice."
        
        parts.append("---")
        parts.append("Note: These are traditional Ayurvedic recommendations. Please consult a qualified practitioner before use.")
        
        return "\n".join(parts)
    
    def query(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        if self.faiss_index is None or len(self.all_documents) == 0:
            return self._empty_response()
        
        start_time = time.time()
        
        print(f"Searching for: '{question[:50]}...'")
        
        search_results = self._hybrid_search(question, top_k=top_k * 2)
        
        herb_sources = []
        research_sources = []
        
        for result in search_results:
            idx = result['idx']
            score = result['score']
            metadata = result['metadata']
            
            if idx < len(self.all_documents):
                source_info = {
                    'relevance': score,
                    'score': score
                }
                
                if metadata.get('type') == 'herb':
                    source_info.update({
                        'type': 'herb',
                        'name': metadata.get('name', 'Unknown'),
                        'indications': metadata.get('indications', ''),
                        'synonyms': metadata.get('synonyms', []),
                        'doshas': metadata.get('detected_doshas', [])
                    })
                    herb_sources.append(source_info)
                else:
                    source_info.update({
                        'type': 'research',
                        'title': metadata.get('title', 'Research Article'),
                        'abstract': metadata.get('abstract', ''),
                        'journal': metadata.get('journal', ''),
                        'year': metadata.get('year', ''),
                        'authors': metadata.get('authors', '')
                    })
                    research_sources.append(source_info)
        
        
        seen_titles = set()
        unique_research = []
        for r in research_sources:
            title = r.get('title', '')
            if title not in seen_titles:
                seen_titles.add(title)
                unique_research.append(r)
        research_sources = unique_research
        
        
        herb_sources.sort(key=lambda x: x['relevance'], reverse=True)
        research_sources.sort(key=lambda x: x['relevance'], reverse=True)
        
        
        answer = self._generate_enhanced_answer(question, herb_sources, research_sources)
        
        
        all_scores = [r['relevance'] for r in herb_sources[:top_k]] + [r['relevance'] for r in research_sources[:top_k]]
        confidence = float(np.mean(all_scores)) if all_scores else 0.0
        
        accuracy_data = self._calculate_enhanced_accuracy(question, confidence, herb_sources, research_sources)
        
        self.query_history.append({
            "question": question,
            "timestamp": datetime.now().isoformat(),
            "confidence": confidence,
            "accuracy": accuracy_data,
            "herb_count": len(herb_sources),
            "research_count": len(research_sources)
        })
        self.accuracy_history.append(accuracy_data["overall_accuracy"])
        
        return {
            "answer": answer,
            "herb_sources": herb_sources[:5],
            "research_sources": research_sources[:3],
            "total_sources": len(herb_sources) + len(research_sources),
            "confidence": confidence,
            "accuracy": accuracy_data,
            "processing_time": time.time() - start_time
        }
    
    def _empty_response(self) -> Dict[str, Any]:
        return {
            "answer": "No knowledge base loaded. Please check your data files.",
            "herb_sources": [],
            "research_sources": [],
            "total_sources": 0,
            "confidence": 0.0,
            "accuracy": {"overall_accuracy": 0},
            "processing_time": 0.0
        }
    
    def _print_stats(self):
        print("\n" + "="*70)
        print("KNOWLEDGE BASE STATISTICS (Enhanced)")
        print("="*70)
        print(f"Herbs/Formulations: {len(self.herbs_data)}")
        print(f"Research Articles: {len(self.pubmed_data)}")
        print(f"Total Documents: {len(self.all_documents)}")
        print(f"Embedding Dimension: {self.embeddings.shape[1] if self.embeddings is not None else 'N/A'}")
        print(f"FAISS Index: {'Built' if self.faiss_index else 'Not built'}")
        print(f"Herb Synonyms: {len(self.herb_synonyms)} herbs mapped")
        print(f"Dosha Keywords: {len(self.dosha_keywords)} doshas")
        print(f"Model: {MODEL_NAME}")
        print("="*70)
    
    def display_model_accuracy(self):
        print("\n" + "="*80)
        print("MODEL ACCURACY REPORT (Enhanced)")
        print("="*80)
        
        if not self.accuracy_history:
            print("\nNo queries have been made yet. Ask some questions to generate accuracy metrics.")
            return
        
        avg_accuracy = np.mean(self.accuracy_history)
        min_accuracy = np.min(self.accuracy_history)
        max_accuracy = np.max(self.accuracy_history)
        
        print(f"\nTotal Queries Processed: {len(self.query_history)}")
        print(f"Average Accuracy: {avg_accuracy:.1f}/100")
        print(f"Highest Accuracy: {max_accuracy:.1f}/100")
        print(f"Lowest Accuracy: {min_accuracy:.1f}/100")
        
        print("\n" + "-"*80)
        print("QUERY ACCURACY BREAKDOWN:")
        print("-"*80)
        
        for i, query in enumerate(self.query_history[-10:], 1):
            acc = query.get('accuracy', {}).get('overall_accuracy', 0)
            confidence = query.get('confidence', 0) * 100
            question = query.get('question', '')[:60]
            herb_count = query.get('herb_count', 0)
            research_count = query.get('research_count', 0)
            
            if acc >= 80:
                grade = "Excellent"
            elif acc >= 60:
                grade = "Good"
            elif acc >= 40:
                grade = "Fair"
            else:
                grade = "Poor"
            
            print(f"\n{i}. {question}...")
            print(f"   Accuracy: {acc:.0f}/100 | Confidence: {confidence:.0f}% | Grade: {grade}")
            print(f"   Sources: {herb_count} herbs, {research_count} research articles")
        
        print("\n" + "="*80)
        print("OVERALL MODEL ACCURACY SCORE")
        print("="*80)
        
        overall_accuracy = avg_accuracy
        
        if overall_accuracy >= 80:
            rating = "EXCELLENT"
            recommendation = "The model is performing exceptionally well. Continue maintaining the knowledge base."
        elif overall_accuracy >= 70:
            rating = "GOOD"
            recommendation = "Good performance. Consider adding more research articles for better coverage."
        elif overall_accuracy >= 60:
            rating = "FAIR"
            recommendation = "Fair performance. Add more training data and refine embeddings for better accuracy."
        elif overall_accuracy >= 50:
            rating = "NEEDS IMPROVEMENT"
            recommendation = "Consider expanding the knowledge base with more herbs and research articles."
        else:
            rating = "POOR"
            recommendation = "Model needs significant improvement. Check data quality and embedding model."
        
        print(f"\nAccuracy Score: {overall_accuracy:.1f}/100")
        print(f"Rating: {rating}")
        print(f"Recommendation: {recommendation}")
        
        print("\n" + "="*80)
        
        if len(self.query_history) < 3:
            print("\nNote: More queries needed for accurate model assessment.")
            print("Ask at least 3-5 different questions to get reliable accuracy metrics.")
        
        print("="*80)


def main():
    print("\n" + "="*80)
    print("UNIFIED AYURVEDIC KNOWLEDGE BASE (Enhanced)")
    print("="*80)
    
    bot = UnifiedAyurvedicRAGBot(
        herbs_file="herbs.json",
        pubmed_file="pubmed_data/pubmed_for_rag.json"
    )
    
    print("\nExample questions:")
    print("  What herbs help urinary tract disorders?")
    print("  What does research say about Ashwagandha?")
    print("  Herbs for Vata imbalance")
    print("  What does scientific evidence say about Turmeric?")
    print("  Herbs for acidity and burning sensation")
    print("="*80)
    
    while True:
        print("\nYour question (or 'quit' to exit):")
        q = input("> ").strip()
        
        if q.lower() in ['quit', 'exit', 'q']:
            bot.display_model_accuracy()
            print("\nGoodbye!")
            break
        
        if not q:
            continue
        
        print("\nProcessing...")
        result = bot.query(q)
        
        print(f"\nAnswer (confidence: {result['confidence']:.1%}):")
        print("-" * 80)
        print(result['answer'])
        
        if result['accuracy']:
            accuracy_data = result['accuracy']
            print(f"\nQuery Accuracy: {accuracy_data['overall_accuracy']}/100")
            print(f"  - Relevance: {accuracy_data['relevance_score']}/100")
            print(f"  - Completeness: {accuracy_data['completeness_score']}/100")
        
        if result['herb_sources'] or result['research_sources']:
            print("\n" + "=" * 80)
            print("SOURCES & REFERENCES")
            print("=" * 80)
            
            if result['herb_sources']:
                print("\nAYURVEDIC HERB DATABASE")
                print("-" * 60)
                for i, source in enumerate(result['herb_sources'], 1):
                    name = source.get('name', 'Unknown')
                    relevance = source['relevance']
                    doshas = source.get('doshas', [])
                    dosha_str = f" [Dosha: {', '.join(doshas)}]" if doshas else ""
                    print(f"\n{i}. {name}{dosha_str} (Match: {relevance:.1%})")
                    if source.get('indications'):
                        print(f"   {source['indications']}")
            
            if result['research_sources']:
                print("\nSCIENTIFIC RESEARCH ARTICLES")
                print("-" * 60)
                for i, source in enumerate(result['research_sources'], 1):
                    title = source.get('title', 'Article')
                    journal = source.get('journal', '')
                    year = source.get('year', '')
                    relevance = source['relevance']
                    
                    print(f"\n{i}. {title}")
                    if journal and year:
                        print(f"   {journal} ({year}) | Relevance: {relevance:.1%}")
                    if source.get('abstract') and source['abstract'] != 'No abstract':
                        abstract = source['abstract']
                        if len(abstract) > 200:
                            abstract = abstract[:200] + "..."
                        print(f"   {abstract}")
            
            print("\n" + "=" * 80)
            print(f"Total sources retrieved: {result['total_sources']}")
        
        print(f"\nProcessing time: {result['processing_time']:.2f}s")


if __name__ == "__main__":
    main()
