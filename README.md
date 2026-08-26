# KrispySkin

A lightweight third-party Minecraft Java skin service.

KrispySkin is designed to provide a simple skin hosting and API system that can be integrated with compatible Minecraft Java clients, launchers, or mods.

Features

- 🖼️ Minecraft Java skin hosting
- 👤 Player/UUID-based skin mapping
- 🔗 Simple API
- 🌐 Web interface
- ☁️ Designed for free-tier hosting
- 🚀 Vercel-friendly architecture
- 🔌 Client/mod integration support

# Planned Features

- [x] Skin upload
- [x] Skin preview
- [x] Skin API
- [x] Skin deletion
- [ ] Skin history
- [ ] Cape support
- [x] User accounts
- [ ] API documentation

Tech Stack

The initial version is planned to use:

- Next.js — Web application and API
- Vercel — Hosting and deployment
- Database — Player and skin metadata
- Object Storage — Skin PNG files

The exact database and storage provider may change depending on the free-tier requirements.

API

The API is planned to provide endpoints similar to:

GET /api/skin/:uuid
GET /api/player/:uuid
POST /api/skin/upload
DELETE /api/skin/:uuid

API documentation will be added when the API is implemented.

Skin Format

KrispySkin will primarily support standard Minecraft Java skin PNG files.

Recommended:

- PNG format
- 64×64 resolution
- Classic and slim player models

Development

Clone the repository:

git clone https://github.com/YOUR_USERNAME/krispyskin.git
cd krispyskin

Install dependencies:

npm install

Run the development server:

npm run dev

Then open:

http://localhost:3000

# Project Status

KrispySkin v0.7 — In Development

making a mod that hook the website api

# License

MIT License

Copyright (c) 2026 Coolguy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

KrispySkin
Minecraft Java third-party skin service.
