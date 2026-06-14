# 🗺️ Traffic Map — Browser Network Visualizer

A local web app that visualizes your laptop's network traffic as a **transport/city map**, where every packet becomes a vehicle traveling between locations. Watch requests and responses animate across the map in real time, and click any vehicle to inspect the underlying packet's metadata.

![Status](https://img.shields.io/badge/Phase_1-Scaffold-blue)

---

## 🎭 The Metaphor

| Network Concept | Visual Metaphor |
|---|---|
| Laptop / Client | 🏠 House |
| DNS Lookup | 📮 Courier van to "Address Office" |
| Router | 🚦 Traffic Signal |
| Firewall | 🚧 Toll Gate |
| Packet | 🚗 Vehicle (bus, truck, bike, van, train) |
| CDN / Cache | 🏭 Warehouse |
| Response | ↩️ Return journey along the same road |
| ISP Hop | 🛣️ Highway Interchange |
| Server | 🏢 Destination Building |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), TypeScript, Tailwind CSS v4, PixiJS v8, Framer Motion, Zustand, Socket.IO Client, Recharts |
| Backend | Python 3.11+, FastAPI, python-socketio (ASGI), Scapy, SQLite |
| Communication | Socket.IO (WebSocket with fallback) |

---

## 📁 Project Structure

```
networking_project/
├── README.md
├── backend/
│   ├── requirements.txt
│   ├── main.py                    # FastAPI + Socket.IO ASGI app
│   ├── config.py                  # App configuration & thresholds
│   ├── models/
│   │   └── packet.py              # Pydantic canonical packet model
│   ├── capture/
│   │   ├── mock_generator.py      # Randomized realistic packet generator
│   │   └── scapy_capture.py       # Real packet capture (Phase 6)
│   ├── engine/
│   │   └── mapping_engine.py      # Raw packet → canonical model
│   ├── storage/
│   │   └── session_store.py       # SQLite session persistence (Phase 8)
│   └── data/                      # SQLite DB files (gitignored)
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── App.tsx                # Main layout
    │   ├── types/packet.ts        # Canonical packet TypeScript type
    │   ├── hooks/                 # Zustand store & Socket.IO hook
    │   ├── components/            # UI panels & map components
    │   └── lib/                   # Constants, socket client
    └── public/assets/             # Vehicle & building sprites
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ and pip
- (Optional) **Npcap** — required only for live packet capture on Windows

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

The backend starts in **simulated mode** by default, emitting realistic mock packets.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔧 Modes

### Simulated Mode (Default)
The app generates realistic mock network traffic — no special permissions needed. Perfect for development, demos, and learning.

### Live Capture Mode (Phase 6+)
Captures real traffic from your network interface.

#### ⚠️ Requirements for Live Capture

**Windows:**
- Install [Npcap](https://npcap.com/) (the WinPcap replacement)
- Run the backend as **Administrator**

**macOS/Linux:**
- Run the backend with `sudo`

```bash
# Windows (Administrator PowerShell)
uvicorn main:socket_app --host 0.0.0.0 --port 8000

# macOS/Linux
sudo python -m uvicorn main:socket_app --host 0.0.0.0 --port 8000
```

---

## 🔒 Privacy & Safety

> **This tool captures traffic on YOUR OWN device and network interface only.**

- ✅ Personal diagnostics and education tool
- ✅ Only captures connection metadata (IPs, ports, sizes, timing, TLS handshake, domain via SNI/DNS)
- ❌ HTTPS payloads are **never** decrypted or stored
- ❌ Not a surveillance or interception tool

---

## 📋 Phase Status

| Phase | Description | Status |
|---|---|---|
| 1 | Data model & project scaffold | ✅ Complete |
| 2 | UI skeleton with static map | ✅ Complete |
| 3 | Vehicle animation | ✅ Complete |
| 4 | Click interaction | ✅ Complete |
| 5 | Real-time backend wiring | ✅ Complete |
| 6 | Real packet capture (Scapy) | ✅ Complete |
| 7 | Analytics dashboard | ✅ Complete |
| 8 | Filters & replay | ✅ Complete |
| 9 | Anomaly flagging | ✅ Complete |

---

## 📝 What's Working (Final Version)

- **Backend**: FastAPI server with Socket.IO emitting packets and SQLite persistence.
- **Capture Modes**: Real packet capture (Scapy) and simulated traffic generation.
- **Mapping Engine**: Fully implemented with anomaly heuristics (size, latency, drops).
- **Frontend**: Vite + React + PixiJS city map with smooth animations and dynamic routing.
- **UI**: Interactive dashboard, live traffic feed, filters, historical replay, and anomaly alerts.
- **Visuals**: Dark neon aesthetic, responsive layout, and emoji-based vehicles on a dual-carriageway highway.

### How to Use

1. Start the backend with `uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload`
2. Start the frontend with `npm run dev`
3. Use the top control bar to switch between Live Capture and Mock modes, apply filters, and view anomalies.
---

## 📄 License

Personal project — not for distribution. For educational and personal network diagnostics use only.
