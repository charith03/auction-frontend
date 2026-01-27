import { useNavigate } from "react-router-dom";
import { useState } from "react";

const IPL_TEAMS = [
    { name: "CSK", logo: "/images/csk.jpg" },
    { name: "MI", logo: "/images/MI.png" },
    { name: "RCB", logo: "/images/RCB.jpg" },
    { name: "KKR", logo: "/images/KKR.jpg" },
    { name: "GT", logo: "/images/GT.jpg" },
    { name: "LSG", logo: "/images/LSG.jpg" },
    { name: "RR", logo: "/images/RR.jpg" },
    { name: "SRH", logo: "/images/SRH.jpg" },
    { name: "DC", logo: "/images/DC.jpg" },
    { name: "PBKS", logo: "/images/PBKS.png" }
];

function Lobby() {
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [username, setUsername] = useState("");
    const [roomCode, setRoomCode] = useState("");
    const navigate = useNavigate();

    const getUsername = () =>
        username.trim() || "Manager_" + Math.floor(Math.random() * 1000);

    const createRoom = async () => {
        if (!selectedTeam) return alert("Please select a team!");

        const res = await fetch("http://127.0.0.1:8000/api/create-room/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                host_name: getUsername(),
                team: selectedTeam
            })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error);

        localStorage.setItem("roomCode", data.code);
        localStorage.setItem("username", getUsername());
        localStorage.setItem("team", selectedTeam);
        localStorage.setItem("isHost", "true");

        navigate("/auction");
    };

    const joinRoom = async () => {
        if (!roomCode) return alert("Enter a Room Code!");
        if (!selectedTeam) return alert("Please select a team!");

        const res = await fetch("http://127.0.0.1:8000/api/join-room/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: roomCode,
                username: getUsername(),
                team: selectedTeam
            })
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error);

        localStorage.setItem("roomCode", roomCode);
        localStorage.setItem("username", getUsername());
        localStorage.setItem("team", selectedTeam);
        localStorage.setItem("isHost", "false");

        navigate("/auction");
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col items-center p-4">
            <header className="w-full max-w-6xl flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center font-bold text-xs shadow-[0_0_10px_rgba(0,255,100,0.5)]">
                        IPL
                    </div>
                    <span className="font-bold tracking-widest text-[#00f7ff]">AUCTION</span>
                </div>
            </header>

            <main className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-12 items-start">

                {/* Left Section: Team Selection */}
                <section className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm order-2 md:order-1">
                    <h2 className="text-2xl font-bold mb-2">Choose Your Franchise</h2>
                    <p className="text-gray-400 text-sm mb-6">Select the team you want to manage for this auction season.</p>

                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                        {IPL_TEAMS.map(team => (
                            <div
                                key={team.name}
                                onClick={() => setSelectedTeam(team.name)}
                                className={`aspect-square rounded-xl p-2 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 border-2
                                    ${selectedTeam === team.name
                                        ? "bg-blue-600/20 border-[#00f7ff] shadow-[0_0_15px_rgba(0,247,255,0.3)] scale-105"
                                        : "bg-black/40 border-transparent hover:bg-white/10 hover:border-white/20"
                                    }`}
                            >
                                <img src={team.logo} alt={team.name} className="w-full h-full object-contain rounded-lg" />
                                <span className="text-[10px] font-bold tracking-wider">{team.name}</span>
                            </div>
                        ))}
                    </div>

                    {/* Auction Rules (Mobile Optimized) */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="text-green-400 font-bold mb-4 flex items-center gap-2">
                            <i className="fas fa-gavel"></i> Auction Rules
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs text-gray-400">
                            <span>💰 120 Cr Budget per Team</span>
                            <span>🌍 8 Overseas Slots</span>
                            <span>⏱️ 15 sec Bid Timer</span>
                            <span>👥 Squad: 18-25 Players</span>
                            <span>⚡ Accelerated Mode</span>
                            <span>⚠️ &lt; 18 Players = Elimination</span>
                        </div>
                    </div>
                </section>

                {/* Right Section: Join Form */}
                <aside className="flex flex-col gap-6 order-1 md:order-2">
                    <div className="text-center md:text-left">
                        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 drop-shadow-lg mb-4">
                            IPL AUCTION LIVE
                        </h1>
                        <p className="text-gray-400">Experience the thrill of the auction table.</p>
                    </div>

                    <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
                        {/* Glow Effect */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none -mt-10 -mr-10"></div>

                        <div className="flex flex-col gap-4 relative z-10">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Manager Name</label>
                                <input
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-[#00f7ff] focus:shadow-[0_0_10px_rgba(0,247,255,0.2)] transition-all text-white placeholder-gray-600"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    placeholder="Enter your display name"
                                />
                            </div>

                            <button
                                onClick={createRoom}
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95"
                            >
                                Create New Room
                            </button>

                            <div className="flex items-center gap-4 py-2">
                                <div className="h-[1px] bg-white/10 flex-1"></div>
                                <span className="text-xs text-gray-500 uppercase font-bold">OR</span>
                                <div className="h-[1px] bg-white/10 flex-1"></div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block">Room Code</label>
                                <input
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500 focus:shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all text-white uppercase tracking-widest font-mono text-center text-lg placeholder-gray-700"
                                    value={roomCode}
                                    onChange={e => setRoomCode(e.target.value.toUpperCase())}
                                    placeholder="ABCD"
                                    maxLength={6}
                                />
                            </div>

                            <button
                                onClick={joinRoom}
                                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95"
                            >
                                Join Existing Room
                            </button>
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}

export default Lobby;
