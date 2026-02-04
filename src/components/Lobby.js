import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

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
    const [isPublic, setIsPublic] = useState(true); // New: Default Public
    const [showRoomBrowser, setShowRoomBrowser] = useState(false); // New: Toggle Browser
    const [activeRooms, setActiveRooms] = useState([]); // New: Store active rooms
    const navigate = useNavigate();

    // Fetch rooms for the count badge
    useEffect(() => {
        fetchActiveRooms();
        const interval = setInterval(fetchActiveRooms, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchActiveRooms = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/rooms/");
            if (res.ok) {
                const data = await res.json();
                setActiveRooms(data);
            }
        } catch (err) {
            console.error("Failed to fetch rooms", err);
        }
    };

    const getUsername = () =>
        username.trim() || "Manager_" + Math.floor(Math.random() * 1000);

    const createRoom = async () => {
        if (!selectedTeam) return alert("Please select a team!");

        const res = await fetch("http://127.0.0.1:8000/api/create-room/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                host_name: getUsername(),
                team: selectedTeam,
                is_public: isPublic // Send public status
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
        <div className="min-h-screen bg-[#0a0a0a] text-white font-sans overflow-x-hidden">
            {/* HERO SECTION */}
            <div className="min-h-screen flex flex-col items-center justify-start pt-10 p-4 relative">
                {/* Background Glows */}
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none"></div>

                <header className="absolute top-6 left-8 z-50">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center font-bold text-xs shadow-[0_0_10px_rgba(0,255,100,0.5)]">
                            IPL
                        </div>
                        <span className="font-bold tracking-widest text-[#00f7ff]">AUCTION</span>
                    </div>
                </header>


                <div className="text-center mb-6 relative z-10 mt-4">
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 drop-shadow-[0_2px_10px_rgba(255,0,0,0.5)] mb-2 tracking-tight">
                        IPL AUCTION LIVE
                    </h1>
                    <p className="text-gray-400 text-lg">Experience the thrill of the auction table.</p>
                </div>

                <main className="w-full max-w-6xl flex flex-col md:flex-row gap-8 items-stretch relative z-10 transition-all">

                    {/* Left Section: Team Selection */}
                    <section className="flex-1 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm order-2 md:order-1 flex flex-col justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Choose Your Franchise</h2>
                            <p className="text-gray-400 text-sm mb-6">Select the team you want to manage for this auction season.</p>

                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                                {IPL_TEAMS.map(team => (
                                    <div
                                        key={team.name}
                                        onClick={() => setSelectedTeam(team.name)}
                                        className={`aspect-square rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center relative overflow-hidden group
                                    ${selectedTeam === team.name
                                                ? "ring-4 ring-[#00f7ff] shadow-[0_0_20px_rgba(0,247,255,0.5)] scale-110 opacity-100"
                                                : "opacity-70 hover:opacity-100 hover:scale-105"
                                            }`}
                                    >
                                        <img src={team.logo} alt={team.name} className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110" />

                                        {/* Optional: Add name overlay on hover if needed, but user said remove names. Keeping it clean. */}
                                    </div>
                                ))}
                            </div>
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

                    {/* Vertical Divider for Desktop */}
                    <div className="hidden md:block w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent self-stretch mx-4"></div>

                    {/* Right Section: Join Form */}
                    <aside className="flex-1 flex flex-col gap-6 order-1 md:order-2">

                        <div className="bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden h-full flex flex-col justify-center">
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

                                {/* Public/Private Toggle Switch */}
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-2 block">Room Visibility</label>
                                    <div className="flex items-center justify-between bg-black/50 border border-white/10 rounded-xl p-3">
                                        <div className="flex flex-col">
                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                {isPublic ? (
                                                    <><i className="fas fa-lock-open text-green-400"></i> Public Room</>
                                                ) : (
                                                    <><i className="fas fa-lock text-red-500"></i> Private Room</>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500">
                                                {isPublic ? "Anyone can find & join" : "Only people you invite"}
                                            </span>
                                        </div>

                                        <div
                                            onClick={() => setIsPublic(!isPublic)}
                                            className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${isPublic ? 'bg-green-500' : 'bg-gray-700'}`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isPublic ? 'translate-x-7' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
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

                            {/* Browse Rooms Button */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setShowRoomBrowser(true)}
                                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 group"
                                >
                                    <i className="fas fa-globe text-blue-400 group-hover:animate-pulse"></i>
                                    Browse Live Auction Rooms
                                    <span className="text-xs bg-green-500 text-black font-bold px-2 py-0.5 rounded-full mt-0.5">
                                        ((o)) {activeRooms.length}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </aside>
                </main>

                {/* Room Browser Overlay */}
                {showRoomBrowser && (
                    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col p-4 md:p-8 animate-in fade-in duration-200">
                        <header className="flex items-center justify-between max-w-6xl mx-auto w-full mb-8">
                            <button onClick={() => setShowRoomBrowser(false)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                                <i className="fas fa-arrow-left"></i> Back
                            </button>
                            <h2 className="text-2xl font-bold">Live Auction Rooms</h2>
                            <button onClick={fetchActiveRooms} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                                <i className="fas fa-sync-alt"></i>
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeRooms.map(room => (
                                    <div key={room.code} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-white/20 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                {room.status === 'LIVE' && (
                                                    <span className="text-[10px] font-bold bg-red-500/20 text-red-500 px-2 py-1 rounded-full border border-red-500/30 animate-pulse">
                                                        ((●)) LIVE
                                                    </span>
                                                )}
                                                {room.status === 'WAITING' && (
                                                    <span className="text-[10px] font-bold bg-green-500/20 text-green-500 px-2 py-1 rounded-full border border-green-500/30">
                                                        WAITING
                                                    </span>
                                                )}
                                                <h3 className="text-xl font-bold mt-2">Mega Auction</h3>
                                                <p className="text-sm text-gray-400">Host: {room.host} ({room.host_team})</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-mono font-bold text-gray-200">{room.player_count}<span className="text-sm text-gray-500">/10</span></div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Teams</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="text-xs text-gray-500 font-mono tracking-widest bg-black/30 px-2 py-1 rounded">
                                                {room.code}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setRoomCode(room.code);
                                                    setShowRoomBrowser(false);
                                                }}
                                                className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all"
                                            >
                                                Join Now <i className="fas fa-arrow-right ml-1"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {activeRooms.length === 0 && (
                                    <div className="col-span-full text-center py-20 text-gray-500">
                                        <i className="fas fa-ghost text-4xl mb-4 opacity-50"></i>
                                        <p>No active rooms found. Create one!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION 2: WHY PLAY */}
            <section className="py-24 px-4 bg-black relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="max-w-6xl mx-auto relative z-10">
                    <h2 className="text-4xl font-bold text-center mb-16 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Why Play IPL Auction Game?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                span: "md:col-span-2",
                                icon: "fas fa-users",
                                title: "Collaborate with Friends",
                                desc: "It's not just about bidding; it's about the banter. Invite your friends, strategize, and enjoy the real auction pressure together."
                            },
                            {
                                span: "md:col-span-1",
                                icon: "fas fa-gavel",
                                title: "Real Auction Atmosphere",
                                desc: "Feel the heat of the hammer! With authentic timers and bid increments, experience the tension of a real IPL auction room."
                            },
                            {
                                span: "md:col-span-1",
                                icon: "fas fa-trophy",
                                title: "Become the Champion",
                                desc: "Who built the best squad? Our smart system analyzes your team balance and star power to crown the ultimate winner."
                            },
                            {
                                span: "md:col-span-2",
                                icon: "fas fa-stopwatch",
                                title: "Authentic Timer System",
                                desc: "IPL style countdown timer adds pressure and excitement to every bid decision."
                            },
                            {
                                span: "md:col-span-1",
                                icon: "fas fa-mobile-alt",
                                title: "Works on Any Device",
                                desc: "Play on mobile, tablet, or desktop. No app download needed - just open and play."
                            },
                            {
                                span: "md:col-span-2",
                                icon: "fas fa-user-check",
                                title: "No Sign Up Required",
                                desc: "Jump straight into the auction. No account needed - just enter your name and start."
                            }
                        ].map((feature, idx) => (
                            <div key={idx} className={`${feature.span} relative overflow-hidden bg-[#111] border border-white/5 p-8 rounded-3xl hover:border-yellow-500/30 hover:bg-[#161616] transition-all duration-300 group hover:-translate-y-1`}>

                                {/* Background Decoration for Large Cards */}
                                {feature.span === "md:col-span-2" && (
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>
                                )}

                                <div className="relative z-10 flex flex-col md:flex-row items-start gap-6">
                                    <div className={`shrink-0 w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors`}>
                                        <i className={`${feature.icon} text-2xl text-yellow-500`}></i>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-yellow-400 transition-colors">{feature.title}</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 3: HOW TO PLAY */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold mb-4">How to Play IPL Auction</h2>
                    <p className="text-gray-400 mb-12">Get started in 3 simple steps.</p>

                    <div className="space-y-8 text-left">
                        {[
                            { step: "1", title: "Create or Join a Room", desc: "Enter your name, pick your favorite IPL team, and create a room. Share the room code with friends so they can join." },
                            { step: "2", title: "Rules of the Game", desc: "You have 120 Crores to build a squad of 18-25 players. Max 8 Overseas players allowed. Be strategic!" },
                            { step: "3", title: "Bidding & Winning", desc: "Bid for players in real-time. After the auction, our system evaluates every squad to announce the ONE true Winner!" }
                        ].map((s, idx) => (
                            <div key={idx} className="flex gap-6 items-start">
                                <div className="w-12 h-12 rounded-full bg-orange-500 flex flex-shrink-0 items-center justify-center font-bold text-black text-xl">
                                    {s.step}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">{s.title}</h3>
                                    <p className="text-gray-400">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SECTION 4: MODES */}
            <section className="py-20 px-4 bg-white/5">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-12">Choose Your Auction Mode</h2>
                    <div className="flex justify-center">
                        <div className="bg-[#1a1a1a] border border-orange-500/50 p-8 rounded-2xl relative overflow-hidden group max-w-lg w-full transform hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,165,0,0.2)]">
                            <div className="absolute top-0 right-0 bg-orange-500 text-black font-bold px-3 py-1 text-xs rounded-bl-lg">Exclusive</div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                    <i className="fas fa-gavel text-2xl text-orange-500"></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Mega Auction</h3>
                                    <span className="text-xs text-orange-400">Full Experience</span>
                                </div>
                            </div>
                            <ul className="space-y-3 text-sm text-gray-400">
                                <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Build your dream team from scratch</li>
                                <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Full 120 Crore budget per team</li>
                                <li className="flex items-center gap-2"><i className="fas fa-check text-green-500"></i> Compete with friends to be the Winner</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 border-t border-white/10 text-center">
                <div className="bg-gradient-to-r from-orange-900/40 to-red-900/40 border border-orange-500/30 max-w-4xl mx-auto rounded-3xl p-12 mb-12">
                    <h2 className="text-3xl font-bold mb-4">Play Real-Time Auction & Become the Champion</h2>
                    <p className="text-gray-300 mb-8">Build your dream team, outbid your friends, and let our system crown the true Auction Winner! <br />Experience the pressure, the glory, and the fun.</p>
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-8 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-bold rounded-lg hover:scale-105 transition-transform">
                        <i className="fas fa-play mr-2"></i> Start Playing Now
                    </button>
                </div>

                <div className="text-gray-500 text-sm">
                    <p>Made by Cricket Lover</p>
                    <div className="flex justify-center gap-4 mt-4 text-xl">
                        <a href="https://github.com/charith03" target="_blank" rel="noopener noreferrer">
                            <i className="fab fa-github hover:text-white cursor-pointer transition-colors"></i>
                        </a>
                        <i className="fab fa-twitter hover:text-blue-400 cursor-pointer transition-colors"></i>
                        <i className="fab fa-instagram hover:text-pink-500 cursor-pointer transition-colors"></i>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Lobby;
