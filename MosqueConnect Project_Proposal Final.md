## MosqueConnect

A Geolocation-Based Mosque & Community Engagement Platform

## Course Title: Web application development with DevOps

Course Code: CSE 3100

Submitted to: Md. Reasad Zaman Chowdhury

Lecturer

Ahsanullah University of Science & Technology

Ali Ahnaf

Software Engineer II

Cefalo Bangladesh Ltd.

1.Israt Jahan Arna

ID: 20230204056

2. Noushin Anamika Urmee

ID: 20230204061 Role: Frontend

3. MD. Al-Nur Bin Khubaira

ID: 20230204065 Role: Backend

Group: 4 | Section: B1

Date of Submission: 5 July, 2026

Submitted by:

Role: Full-Stack Modules, Testing & DevOps


## 1. Executive Summary

MosqueConnect is a web platform that connects Muslims with the mosques around them. Right now, mosque information such as Jamat times, Jummah announcements, events, donation campaigns, and volunteer opportunities is shared through word of mouth, posters, and scattered WhatsApp or Facebook groups. This information is often incomplete or outdated, and many community members never receive it at all.

MosqueConnect brings all of this into one place. Users open a map that shows every nearby mosque along with its next Jamat time. Verified mosque administrators keep the timetables, announcements, and events up to date, and subscribers get notified automatically whenever something important changes.

The platform also helps make mosques accessible to the whole family: users can find nearby mosques that have a dedicated women's prayer space, or a safe children's area where parents can keep their children while they pray.

The platform will be delivered as a fully functional web application built with Laravel and HTML/CSS, containerized with Docker, and deployed to a cloud VPS with a public URL.

## 2. Problem Statement

- Every mosque sets its own Jamat times, and these change with the seasons and during Ramadan. There is no reliable place to check them.

- Announcements such as Eid prayers, janazah notices, events, and donation drives reach only those physically present or in the right group chat.

- Newcomers to an area have no easy way to discover nearby mosques or their facilities.

- Women and parents have no way to know in advance which mosques have a women's prayer section or a children's space where kids can stay safe during Salah, so many end up not attending at all.

- Generic map services are not maintained by mosque authorities, so their information cannot be trusted.


## 3. Objectives

- 1. Build a geolocation-based home page map showing the user and all nearby mosques sorted by distance, each with its next Jamat time.

- 2. Let users filter and find nearby mosques with a women's prayer space or a safe children's area, making mosques accessible to the whole family.

- 3. Give every mosque a verified profile that only approved mosque administrators can edit, so the community always has one accurate source of information.

- 4. Let users subscribe to their preferred mosques and receive notifications for prayer time changes, urgent notices, and events.

- 5. Support community life through events, donation campaign information, and a community hub for volunteering, blood requests, lost & found, and complaints.

- 6. Deliver the system with professional engineering practice: GitHub pull requests, automated testing, Docker, CI/CD, and documented VPS deployment.


## 4. Target Audience

MosqueConnect is designed for the everyday Muslim community of a city like Dhaka, where mosques are within walking distance but reliable information about them is not. The primary audiences are:

- General worshippers who want accurate Jamat and Jummah times for the mosques around their home or workplace.

- Women and parents who need to know in advance which mosques have a dedicated women’s prayer space or a safe children’s area before deciding where to pray.

- Newcomers to an area (students, new residents, office workers) who want to quickly discover nearby mosques and their facilities.

- Mosque committees and imams who need an organized channel to publish prayer times, announcements, and events to their community.

- Volunteers and donors who want to find opportunities to contribute to mosque programs, charity drives, and community campaigns.

In short, the platform serves both sides of the mosque community: the people who attend, and the people who run the mosque.

## 5. Users & Roles

| Role | Capabilities |
| --- | --- |
| Visitor | Browses the map, mosque profiles, and prayer times without an account |
| Registered User | Subscribes to mosques, receives notifications, uses the community hub, sends feedback |
| Mosque Admin | Verified representative; manages the mosque profile, prayer times, announcements, and events |
| Super Admin | Approves mosque admin claims and moderates content platform-wide |


## 6. Proposed Solution & Key Features

## 6.1 Proposed Solution

MosqueConnect replaces scattered, informal mosque communication with a single web platform. A visitor opens the site and immediately sees a map of nearby mosques with their next Jamat times. Each mosque has a verified profile that only its approved administrators can update, which keeps prayer times, announcements, and events accurate. Registered users follow the mosques they attend and receive notifications whenever something changes. Beyond prayer information, a community hub lets people volunteer, post blood donation requests, report lost and found items, and submit complaints, turning the platform into a practical tool for everyday community life.

## 6.2 Core Features

| Icon | Feature | Description |
| --- | --- | --- |
|   | Interactive Map | Displays nearby mosques with Jamat times, sorted by distance |
|   | Mosque Profile | Prayer times, facilities, photos, and contact information |
|   | Women's Prayer Area | Filter mosques with dedicated women's prayer spaces |
|   | Child Care Facility | Filter mosques with supervised children's areas |
|   | Announcements | Official mosque updates with urgency levels |
|   | Events | Islamic lectures, classes, and community programs |
| 🤝 | Community Hub | Volunteering, blood requests, lost & found, complaints |
|   | Donations | View mosque donation campaigns and progress |
|   | Notifications | Prayer time changes and announcement alerts |
|   | Ramadan Mode | Sehri, Iftar, and Taraweeh schedules |


- 7. System Workflow

The typical user journey through the application:

User

↓

Home Page (Interactive Map)

↓

Select Nearby Mosque

↓

Mosque Profile

↓

Follow Mosque

↓

Receive Notifications

↓

Community Hub / Events / Donations

Mosque administrators follow a parallel flow: they register, claim their mosque with proof, get approved by the super admin, and then manage prayer times, announcements, and events from their dashboard.


## 8. System Architecture

The application follows a standard layered architecture, fully containerized and deployed to the cloud:

The system is split into a React single-page application (frontend) and a Laravel REST API (backend). The React app is served as static assets through Nginx and communicates with the Laravel API over HTTP (JSON). Laravel handles authentication, business logic, and database access through MySQL. A separate queue worker container processes notification jobs in the background. Everything runs inside Docker containers on a cloud VPS.

## 9. Technology Stack

| Component | Technology |
| --- | --- |
| Backend | Laravel (PHP): REST API, Eloquent ORM, role-based Policies, queued notifications |
| Frontend | React (Vite) single-page app with Bootstrap 5, mobile-first responsive design |
| Map |Google map api|
| Database | MySQL |
| Containerization | Docker & Docker Compose (app, Nginx, MySQL, queue worker) |
| CI/CD | GitHub Actions: tests on every pull request, deploy on merge |
| Hosting | Cloud VPS with a publicly accessible URL |


## 10. Project Timeline

| Milestone | Deliverables |
| --- | --- |
| Checkpoint 1 (Lab 3) | Member 1 (Integration & DevOps): GitHub repo setup + branch/PR workflow, initial Docker Compose (app, Nginx, MySQL), PHPUnit test setup + first tests (auth, nearby query), frontend-backend integration of the map Member 2 (Frontend): React app setup (Vite, routing), Login/register pages, base layout & navigation, home page with Google Maps UI (user location + mosque pins with popups) Member 3 (Backend): Database migrations & models, authentication with roles, mosque CRUD API, claim/verification flow, nearby-mosque Haversine query |
| Checkpoint 2 (Lab 4) | Member 1 (Integration & DevOps): Events + donations + Ramadan mode (full- stack), super admin panel (claim approval, moderation), queue worker container, tests for all new features, PR reviews Member 2 (Frontend): Mosque profile page (timetable, badges, announcements feed), mosque admin dashboard UI, search & filter UI, notification center UI Member 3 (Backend): Timetable API (effective dates), announcements with urgency levels, subscriptions + notification system (events, queued jobs), community hub backend (volunteers, blood requests, lost & found, complaints) |
| Final (Lab 6) | Member1 (Integration & DevOps): GitHub Actions CI/CD pipeline (test on PR, deploy on merge), VPS setup + deployment with public URL, README + setup documentation + architecture diagram Member 2 (Frontend): UI polish, mobile/responsive QA, cross-browser fixes, demo walkthrough preparation Member 3 (Backend): Seed/demo data, code cleanup & comments, remaining test coverage, performance fixes |


## 11. Why This Project

MosqueConnect solves a real problem that our own community deals with every day, and the family- friendly mosque finder helps women and parents find mosques that can accommodate them. Since only verified administrators can publish official information, the platform is more trustworthy than the channels people currently rely on. The scope is realistic for the course timeline, with a complete and demoable MVP planned across the three checkpoints. The design also covers every part of the evaluation rubric, including a relational database with meaningful relationships, a REST API, a full responsive UI, clean Laravel architecture, Docker integration, a working CI/CD pipeline, and a documented deployment on a public URL.

## 12. Future Enhancements

- Mobile application (Android & iOS)

- Online donation payment integration

- AI-based mosque recommendation

- Bangla & English language support

- Qibla direction finder

## 13. Conclusion

MosqueConnect brings scattered mosque communication into one organized and reliable platform, and it supports the mosque's role in community life rather than replacing it. The project has clear social value, a realistic scope, and fits the course requirements well. We request the Product Owner's approval to proceed with development.
