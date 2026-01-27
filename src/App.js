import { BrowserRouter, Routes, Route } from "react-router-dom";
import Lobby from "./components/Lobby";
import AuctionRoom from "./components/AuctionRoom";
import Summary from "./components/Summary";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/auction" element={<AuctionRoom />} />
        <Route path="/summary" element={<Summary />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
