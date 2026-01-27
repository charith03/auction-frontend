# 🏏 IPL Auction Simulator (Frontend)

A stunning, real-time IPL Auction web application built with **React** and **Tailwind CSS**. It features a "Black-Box AI" engine that evaluates teams after the auction to declare a winner based on hidden cricket logic.

## 🌟 Key Features

### 1. Immersive Auction Room
-   **Neon/Dark Theme**: Premium UI inspired by modern sports apps.
-   **Real-Time Bidding**: Live updates for bids, timer, and budget tracking.
-   **Dynamic Animations**: Confetti, glowing borders, and smooth transitions.
-   **Responsive Design**: Fully optimized for Desktop, Tablet, and Mobile.

### 2. Post-Auction Gameplay
-   **Qualification Phase**: Teams must have at least **18 players** to qualify.
-   **Playing XI Selection**: reliable drag-and-drop style selection.
    -   **Validation**: Enforces **Max 4 Overseas Players** rule.
    -   **Validation**: Requires exactly **11 Players**.
-   **Winner Declaration**: A celebratory screen revealing the winner based on our custom AI engine.

## 🧠 The AI Evaluation Logic
The winner is NOT determined by who spent the most money. It is determined by **Squad Balance**:
1.  **Player Power Index (PPI)**: Every player has a hidden strength score based on real-world stats (Value, Role, Consistency).
2.  **Team Balance**: Bonus points for having a good mix of Batters, Bowlers, and All-Rounders.
3.  **Penalties**:
    -   Missing Wicket Keeper? **-50 pts**
    -   Weak Bowling Attack (<5 bowlers)? **-10 pts per missing bowler**

## 🚀 How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start the App**:
    ```bash
    npm start
    ```
3.  Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 🛠️ Tech Stack
-   **React.js** (Hooks, State Management)
-   **Tailwind CSS** (Styling & Responsiveness)
-   **Axios** (API Communication)
