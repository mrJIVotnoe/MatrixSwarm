# MatrixSwarm 🐝

**Decentralized Node Orchestrator for Distributed Computing**

MatrixSwarm is a proof-of-concept decentralized network designed to harness the idle compute power of legacy devices (smartphones, old laptops, Raspberry Pis) to create a global, private, and distributed compute pool. Inspired by the **Matrix Protocol**, it prioritizes privacy, end-to-end encryption, and decentralized control.

## 🚀 Key Features

- **Decentralized Swarm**: Connect any device to the network and contribute to the global compute pool.
- **Matrix-Inspired Architecture**: Built with privacy and decentralization as core principles.
- **Real-time Monitoring**: A comprehensive dashboard to track swarm health, node distribution, and task execution.
- **AI-Ready**: Nodes are categorized into AI tiers (LLM, SLM, Generic) based on their hardware capabilities.
- **Dynamic Task Dispatching**: Smart task assignment based on node RAM, CPU, and current temperature.
- **Mobile-First Node Client**: A dedicated client for smartphones to easily join the swarm.
- **Deep Task Inspection**: Inspect task payloads, results, and execution traces in real-time.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Motion (for animations), Lucide Icons.
- **Backend**: Node.js, Express, WebSocket (for real-time updates).
- **Database**: Firebase Firestore (for decentralized state management).
- **Security**: Strict Firestore Security Rules, Admin-level controls.

## 📦 Getting Started

### Prerequisites

- Node.js (v18+)
- Firebase Project (for Firestore and Auth)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/MatrixSwarm.git
   cd MatrixSwarm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a `firebase-applet-config.json` in the root directory with your Firebase credentials (see `.env.example` for the required structure).

4. Start the development server:
   ```bash
   npm run dev
   ```

5. (Optional) Run the node simulator to populate the dashboard:
   ```bash
   npm run simulate
   ```

## 🛡 Security & Privacy

MatrixSwarm implements a "Default Deny" security model. All data access is restricted via Firestore Security Rules, ensuring that only authenticated nodes and users can interact with the swarm.

## 📜 License

This project is licensed under the Apache-2.0 License.

---

*Built for the decentralized future. Inspired by the Matrix.*
