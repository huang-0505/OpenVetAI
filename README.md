# 🐾 Vet Data Ingestion Portal

The **Vet Data Ingestion Portal** is a full-stack application designed to streamline the ingestion and curation of veterinary journals and research papers. This portal enables researchers and contributors to upload, review, and approve text data for training a domain-specific veterinary Large Language Model (VetLLM).

## 🚀 Live Demo

🔗 [Launch the portal](https://v0-data-ingestion-portal-three.vercel.app/)

---

## 📌 Features

- ✅ **Database Connection Monitoring**  
  Displays live connection status to Supabase and tracks record counts by status (`Approved`, `Rejected`, etc.).

- 📤 **Data Upload Interface**  
  Upload veterinary-related research papers via:
  - File uploads (PDF, TXT, DOCX, etc.)
  - URL input for scraping journal websites

- 📊 **Record Status Dashboard**  
  Visual dashboard summarizing:
  - Total records uploaded
  - Approved, Rejected, and Ready entries

- 🧠 **Training Schedule View**  
  View current training frequency, next scheduled model training date, and last completed cycle.

- 👁️ **Review & Approval Workflow** (Planned)
  - Manually review and approve/reject raw entries for model training
  - Flag incomplete or low-quality data

- 📦 **Backed by Supabase**
  All uploaded data is stored in a Supabase PostgreSQL database with role-based access and real-time sync.

---

## 🛠️ Tech Stack

| Frontend         | Backend           | Database       | Hosting      |
|------------------|-------------------|----------------|--------------|
| V0 + Next.js + Tailwind CSS | Node.js / API Routes | Supabase       | Vercel       |

---

## 🧪 Planned Enhancements
📈 Better Quality metrics and readability scoring

🔍 NER pre-labeling and structured extraction

✍️ Manual annotation interface for diseases, drugs, species, etc.

🤖 Background preprocessing pipeline (PDF-to-text, OCR, cleaning)

🔗 Integration with LangChain & vector DB for embedding injection

🧬 Model training trigger with version tracking


## 🙌 Acknowledgments
This portal is part of a broader effort to develop VetLLM — a domain-specific language model fine-tuned on veterinary literature. We welcome contributions from researchers, veterinarians, and open-source developers.

