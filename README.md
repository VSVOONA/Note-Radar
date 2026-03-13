# 🚀 NoteRadar – Smart Academic Resource Finder

NoteRadar is a smart platform designed to help students quickly discover high-quality academic resources such as notes, PPTs, and study materials during exam time.

Instead of searching across multiple groups and platforms, students can find verified study resources in one place.

This project was built as part of a hackathon to improve the way academic resources are shared and discovered.

---

# 📚 Problem Statement

During exam periods, students often struggle to find reliable study materials.

Common issues include:

* Important notes are scattered across WhatsApp groups, Google Drive folders, and emails.
* Students receive multiple versions of the same material without knowing which one is correct.
* There is no proper system to verify whether the uploaded resource is reliable.
* Faculty members sometimes share high-quality resources, but they get lost in chat groups.

Because of this, students waste valuable time searching for the right material instead of studying.

---

# 💡 Our Solution

NoteRadar provides a centralized academic resource platform where students can easily discover verified study materials.

Key idea:

Students can search and access resources uploaded by faculty members and trusted contributors.

To ensure reliability, the platform introduces a **Faculty Verification Gate** before uploading resources.

This ensures that trusted academic materials are prioritized.

---

# ✨ Key Features

## 🔎 Smart Resource Discovery

Students can search and browse study materials by subject, topic, and type.

Supported resource types:

* PDF notes
* PowerPoint presentations

---

## 🧑‍🏫 Faculty Verification System

Before uploading resources, users must pass a **Faculty Verification step**.

Process:

1. User opens the Upload Resource page
2. Platform asks: "Are you a Faculty Member?"
3. Faculty uploads institutional ID
4. System performs simulated verification
5. Access to upload form is granted

Verified uploads receive a badge:

**Faculty Verified Resource ✓**

---

## 📂 Resource Upload System

Faculty members can upload academic resources with the following information:

* Resource Title
* Resource Type (PDF / PPT)
* Subject
* Topic
* File URL (Direct link)
* Description
* High Priority Exam Resource tag

This allows students to quickly identify important study material.

---

## 🏷 Resource Reliability Badge

Resources uploaded by verified faculty are marked with:

**Faculty Verified ✓**

This helps students easily identify trustworthy materials.

---

# 🏗 System Architecture (High Level)

The system follows a simple frontend + database architecture.

User Flow:

Student / Faculty
↓
NoteRadar Web App
↓
Resource Upload / Search
↓
Database Storage
↓
Resource Discovery

Verification Flow:

Upload Page
↓
Faculty Verification Gate
↓
Simulated ID Verification
↓
Access to Upload Form
↓
Publish Resource

---

# 🛠 Tech Stack

Frontend

* React.js
* Tailwind CSS

Backend / Database

* Firebase Firestore

Hosting

* Cloud / Serverless Deployment

Other Tools

* AI-assisted development
* Modern UI components

---

# 📸 Screens (Conceptual)

The platform includes the following screens:

1. Resource Search Page
2. Upload Resource Page
3. Faculty Verification Gate
4. Resource Results with Faculty Verified Badge

---

# 🎯 Hackathon Highlights

This project demonstrates:

* Trust-based academic resource sharing
* Faculty-verified knowledge system
* Better discovery of study materials
* Clean and simple user experience

The goal is to reduce the time students spend searching for reliable study resources during exams.

---

# 🚀 Future Improvements

Possible enhancements for future development:

* Real faculty email verification
* AI-based resource summarization
* Resource rating and feedback system
* Top contributor leaderboard
* Smart recommendation system
* Mobile app version

---

# 👥 Team

Team Leader
Voona Venkata Siddardha

Team Member
Sripurushottama Mohan Sai

Team Member
Magam Blesson

Team Member
Pandiri Mohith Kumar

---

# 🙏 Acknowledgement

This project was developed as part of a hackathon to explore innovative solutions for improving academic resource accessibility.

We thank the organizers and mentors for providing the opportunity to build and showcase this idea.

---

⭐ If you like this project, consider giving it a star!
