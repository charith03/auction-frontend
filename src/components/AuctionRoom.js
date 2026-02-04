import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import QualificationScreen from "./PostAuction/QualificationScreen";
import WinnerScreen from "./PostAuction/WinnerScreen";
import DiscordWidget from "./DiscordWidget";

function AuctionRoom() {
    const navigate = useNavigate();
    const isHost = localStorage.getItem("isHost") === "true";
    const roomCode = localStorage.getItem("roomCode");
    const username = localStorage.getItem("username");
    const team = localStorage.getItem("team");

    // Server-synced state
    const [player, setPlayer] = useState({
        name: "Waiting...",
        role: "",
        country: "",
        basePrice: 0,
        age: null,
        hand: null,
        bowling: null,
    });

    const [currentBid, setCurrentBid] = useState(0);
    const [highestBidder, setHighestBidder] = useState(null);
    const [timer, setTimer] = useState(15);
    const [status, setStatus] = useState("WAITING");
    const [isPaused, setIsPaused] = useState(false);
    const [bidIncrement, setBidIncrement] = useState(20);
    const [userBudget, setUserBudget] = useState(120);
    const [defaultTimer, setDefaultTimer] = useState(15);

    // Local state
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [liveFeed, setLiveFeed] = useState([]);
    const [myTeamPlayers, setMyTeamPlayers] = useState([]);
    const [soldStatus, setSoldStatus] = useState(null);
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    const liveFeedRef = useRef(null);
    const chatRef = useRef(null);
    const lastBidRef = useRef(0);
    const lastBidderRef = useRef(null);
    const lastPlayerRef = useRef(null);
    const lastSoldPlayerRef = useRef(null);

    // Audio Refs
    const bidSoundRef = useRef(new Audio("/sounds/Bid_sound.mp3"));
    const soldSoundRef = useRef(new Audio("/sounds/sold.mp3"));
    const timerSoundRef = useRef(new Audio("/sounds/timer.mp3"));

    // Format price
    const formatPrice = (lakhs) => {
        if (lakhs >= 100) {
            const crores = lakhs / 100;
            return `₹${crores.toFixed(2)} Cr`;
        }
        return `₹${lakhs}L`;
    };

    // Audio Logic: Timer
    useEffect(() => {
        // Play only between 10s and 2s (inclusive). Stop at 1s.
        // STOP if player is SOLD/SKIPPED/UNSOLD (soldStatus exists)
        if (isSoundEnabled && !soldStatus && status === "BIDDING LIVE" && timer > 1 && timer <= 10) {
            timerSoundRef.current.currentTime = 0;
            timerSoundRef.current.volume = 0.5; // Slightly lower volume for tick
            timerSoundRef.current.play().catch(e => { /* Ignore autoplay errors */ });
        } else {
            // Ensure silence at 1s, 0s, or other states
            timerSoundRef.current.pause();
            timerSoundRef.current.currentTime = 0;
        }
    }, [timer, status, isSoundEnabled, soldStatus]);

    // MAIN STATE SYNC
    useEffect(() => {
        const syncState = () => {
            axios.get(`http://127.0.0.1:8000/api/room-state/${roomCode}/?team=${team}`)
                .then(res => {
                    const data = res.data;
                    setTimer(data.timer);
                    if (data.default_timer) setDefaultTimer(data.default_timer);

                    if (data.is_paused) {
                        setStatus("PAUSED");
                        setIsPaused(true);
                    } else if (data.is_live) {
                        setStatus("BIDDING LIVE");
                        setIsPaused(false);
                    } else if (data.status === 'SELECTION') {
                        setStatus("SELECTION");
                    } else if (data.status === 'COMPLETED') {
                        setStatus("COMPLETED");
                    } else {
                        setStatus("WAITING");
                    }

                    if (data.players_joined !== undefined) {
                        setPlayersJoined(data.players_joined);
                        setTotalPlayersLimit(data.total_players_limit || 10);
                    }

                    // Check if player changed (to prevent bid sound on player switch)
                    const isNewPlayer = data.current_player && lastPlayerRef.current !== data.current_player.id;

                    if (data.current_bid !== lastBidRef.current || data.highest_bidder !== lastBidderRef.current) {
                        // Play Bid Sound (only if it's not the initial 0 bid load AND not a new player change)
                        if (isSoundEnabled && !isNewPlayer && data.current_bid > 0 && lastBidRef.current !== 0) {
                            bidSoundRef.current.currentTime = 0;
                            bidSoundRef.current.play().catch(e => console.log("Audio error", e));
                        }

                        setCurrentBid(data.current_bid);
                        setHighestBidder(data.highest_bidder);
                        setSoldStatus(null);

                        if (data.highest_bidder) {
                            // addToLiveFeed(`🏏 ${data.highest_bidder} bid ${formatPrice(data.current_bid)}`);
                        }
                        lastBidRef.current = data.current_bid;
                        lastBidderRef.current = data.highest_bidder;
                    }

                    if (data.sold_status && data.current_player) {
                        const currentPlayerId = data.current_player.id;
                        if (lastSoldPlayerRef.current !== currentPlayerId) {
                            lastSoldPlayerRef.current = currentPlayerId;
                            if (data.sold_status === 'SOLD') {
                                setSoldStatus({ type: 'SOLD', price: data.sold_price, team: data.sold_team });
                                // addToLiveFeed(`🏆 ${data.current_player.name} SOLD to ${data.sold_team} for ${formatPrice(data.sold_price)}!`);
                                loadSquadsData(); // Trigger immediate refresh
                                // Play Sold Sound
                                if (isSoundEnabled) {
                                    soldSoundRef.current.currentTime = 0;
                                    soldSoundRef.current.play().catch(e => console.log("Audio error", e));
                                }
                            } else if (data.sold_status === 'UNSOLD') {
                                setSoldStatus({ type: 'UNSOLD' });
                                // addToLiveFeed(`❌ ${data.current_player.name} went UNSOLD`);
                                loadSquadsData(); // Trigger immediate refresh
                            } else if (data.sold_status === 'SKIPPED') {
                                setSoldStatus({ type: 'SKIPPED' });
                                // addToLiveFeed(`⏭️ ${data.current_player.name} SKIPPED`);
                                loadSquadsData(); // Trigger immediate refresh
                            }
                        } else {
                            if (data.sold_status === 'SOLD') setSoldStatus({ type: 'SOLD', price: data.sold_price, team: data.sold_team });
                            else if (data.sold_status === 'UNSOLD') setSoldStatus({ type: 'UNSOLD' });
                            else if (data.sold_status === 'SKIPPED') setSoldStatus({ type: 'SKIPPED' });
                        }
                    } else if (!data.sold_status && soldStatus) {
                        setSoldStatus(null);
                        lastSoldPlayerRef.current = null;
                    }

                    if (data.current_player) {
                        const newPlayerId = data.current_player.id;
                        if (lastPlayerRef.current && lastPlayerRef.current !== newPlayerId) {
                            setSoldStatus(null);
                            lastSoldPlayerRef.current = null;
                        }
                        lastPlayerRef.current = newPlayerId;
                        setPlayer({
                            id: data.current_player.id,
                            name: data.current_player.name,
                            role: data.current_player.role,
                            country: data.current_player.country,
                            basePrice: data.current_player.base_price,
                            age: data.current_player.age,
                            hand: data.current_player.hand,
                            bowling: data.current_player.bowling,
                        });
                    }

                    if (data.bid_increment) setBidIncrement(data.bid_increment);
                    if (data.user_budget !== null) setUserBudget(data.user_budget);
                })
                .catch(err => console.error("State sync error:", err));
        };

        syncState();
        const interval = setInterval(syncState, 1000);
        return () => clearInterval(interval);
    }, [roomCode, team]);

    useEffect(() => {
        const syncMyTeam = () => {
            axios.get(`http://127.0.0.1:8000/api/my-team/${roomCode}/${team}/`)
                .then(res => setMyTeamPlayers(res.data))
                .catch(err => console.error("Team sync error:", err));
        };
        syncMyTeam();
        const interval = setInterval(syncMyTeam, 3000);
        return () => clearInterval(interval);
    }, [roomCode, team]);

    // Poll squads data during WAITING (for lobby list)
    useEffect(() => {
        if (status === "WAITING") {
            const interval = setInterval(loadSquadsData, 2000); // 2s polling
            loadSquadsData(); // Initial call
            return () => clearInterval(interval);
        }
    }, [status, roomCode]);


    useEffect(() => {
        const syncChat = () => {
            axios.get(`http://127.0.0.1:8000/api/chat/${roomCode}/`)
                .then(res => setChatMessages(res.data))
                .catch(err => console.error("Chat sync error:", err));
        };
        syncChat();
        const interval = setInterval(syncChat, 2000);
        return () => clearInterval(interval);
    }, [roomCode]);

    // NEW: Poll Auction Logs (Live Feed Persistence)
    useEffect(() => {
        const syncLogs = () => {
            axios.get(`http://127.0.0.1:8000/api/logs/${roomCode}/`)
                .then(res => {
                    // Only update if different (simple check or just replace)
                    // Since it's a log, replacing is fine, React handles diffing
                    setLiveFeed(res.data);
                })
                .catch(err => console.error("Log sync error:", err));
        };
        syncLogs();
        const interval = setInterval(syncLogs, 2000);
        return () => clearInterval(interval);
    }, [roomCode]);

    useEffect(() => {
        if (liveFeedRef.current) liveFeedRef.current.scrollTop = liveFeedRef.current.scrollHeight;
    }, [liveFeed]);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [chatMessages]);

    const addToLiveFeed = (message) => {
        setLiveFeed(prev => [...prev, { message }]);
    };

    const placeBid = async () => {
        try {
            const stateRes = await axios.get(`http://127.0.0.1:8000/api/room-state/${roomCode}/?team=${team}`);
            const latestBid = stateRes.data.current_bid;
            const latestBidder = stateRes.data.highest_bidder;
            const latestIncrement = stateRes.data.bid_increment;
            const basePrice = stateRes.data.current_player?.base_price || player.basePrice;

            let nextBid;
            if (latestBid === 0 || (latestBid === basePrice && latestBidder === null)) {
                nextBid = basePrice;
            } else {
                nextBid = latestBid + latestIncrement;
            }

            const budgetInLakhs = stateRes.data.user_budget * 100;
            if (nextBid > budgetInLakhs) {
                alert(`Insufficient budget!`);
                return;
            }

            if (myTeamPlayers.length >= 25) {
                alert("Squad Limit Reached!");
                return;
            }

            const isOS = player.country && player.country.toUpperCase() !== 'INDIA';
            const currentOSCount = myTeamPlayers.filter(p => p.country && p.country.toUpperCase() !== 'INDIA').length;
            if (isOS && currentOSCount >= 8) {
                alert("Overseas Player Limit Reached!");
                return;
            }

            await axios.post("http://127.0.0.1:8000/api/place-bid/", { code: roomCode, team: team, amount: nextBid });
        } catch (err) {
            console.error("Bid failed:", err);
            alert(err.response?.data?.error || "Bid failed");
        }
    };

    const startAuction = async () => { try { await axios.post("http://127.0.0.1:8000/api/start-auction/", { code: roomCode }); } catch (err) { console.error("Start failed:", err); alert(err.response?.data?.error || "Start failed"); } };
    const pauseAuction = async () => { try { await axios.post("http://127.0.0.1:8000/api/pause-auction/", { code: roomCode }); } catch (err) { console.error("Pause failed:", err); alert(err.response?.data?.error || "Pause failed"); } };
    const skipPlayer = async () => { try { await axios.post("http://127.0.0.1:8000/api/skip-player/", { code: roomCode }); } catch (err) { console.error("Skip failed:", err); alert(err.response?.data?.error || "Skip failed"); } };
    const endAuction = async () => { try { await axios.post("http://127.0.0.1:8000/api/end-auction/", { code: roomCode }); } catch (err) { console.error("End failed:", err); alert(err.response?.data?.error || "End failed"); } };
    const sendMessage = async () => { if (!chatInput.trim()) return; try { await axios.post("http://127.0.0.1:8000/api/send-message/", { code: roomCode, sender: username, message: chatInput }); setChatInput(""); } catch (err) { console.error("Chat failed:", err); } };

    const [upcomingPlayers, setUpcomingPlayers] = useState([]);
    const [unsoldPlayers, setUnsoldPlayers] = useState([]);
    const [showUpcoming, setShowUpcoming] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDiscord, setShowDiscord] = useState(false);
    const [feedTab, setFeedTab] = useState('feed');
    const [selectedSquad, setSelectedSquad] = useState(null); // State for modal view of other squads // 'feed' | 'chat'
    const [squads, setSquads] = useState([]);
    const [playersJoined, setPlayersJoined] = useState(0);
    const [totalPlayersLimit, setTotalPlayersLimit] = useState(10);
    const [showSquads, setShowSquads] = useState(false);
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [squadTab, setSquadTab] = useState('my'); // 'my', 'others', 'unsold'

    const fetchUpcomingPlayers = async () => { try { const res = await axios.get(`http://127.0.0.1:8000/api/upcoming-players/${roomCode}/`); setUpcomingPlayers(res.data); setShowUpcoming(true); } catch (err) { } };
    const loadUnsoldPlayers = async () => { try { const res = await axios.get(`http://127.0.0.1:8000/api/unsold-players/${roomCode}/`); setUnsoldPlayers(res.data); } catch (err) { } };

    // Updated fetch without side effects (no modal)
    const loadSquadsData = async () => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/summary/${roomCode}/`);
            setSquads(res.data);
        } catch (err) { console.error("Failed to load squads", err); }
    };

    const updateSettings = async (val) => { try { await axios.post("http://127.0.0.1:8000/api/update-settings/", { code: roomCode, timer_duration: val }); setDefaultTimer(val); } catch (err) { } };
    const getSquadDetails = (teamData) => { return { spent: 120 - teamData.budget_remaining, osCount: teamData.players.filter(p => p.country && p.country.toUpperCase() !== 'INDIA').length }; };

    // Helper to get sorted data
    const getLeaderboardStats = () => {
        // 1. Highest Bidded Player
        let allPlayers = squads.flatMap(t => t.players.map(p => ({ ...p, team: t.team })));
        let topPlayer = null;
        if (allPlayers.length > 0) {
            topPlayer = allPlayers.sort((a, b) => b.price - a.price)[0];
        }

        // 2. Teams by Expenditure (Highest spent first)
        let sortedTeams = [...squads].map(t => {
            const spent = 120 - t.budget_remaining;
            const osCount = t.players.filter(p => p.country && p.country.toUpperCase() !== 'INDIA').length;
            return { ...t, spent, osCount };
        }).sort((a, b) => b.spent - a.spent);

        return { topPlayer, sortedTeams };
    };


    const getNextBidAmount = () => {
        if (highestBidder === null || currentBid === 0) return player.basePrice;
        return currentBid + bidIncrement;
    };

    // --- WAITING ROOM UI ---
    if (status === "WAITING") {
        return (
            <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans p-4 md:p-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white flex items-center gap-2 transition">
                        <i className="fas fa-arrow-left"></i> Back
                    </button>
                    <div className="text-right">
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">Room Code</div>
                        <div className="text-3xl font-mono font-bold text-yellow-500 tracking-widest">{roomCode}</div>
                    </div>
                </header>

                <main className="flex-1 max-w-4xl mx-auto w-full flex flex-col gap-8">
                    {/* Invite Section */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-neon-cyan">
                            <i className="fas fa-share-nodes"></i> Invite Friends
                        </h3>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={`http://localhost:3000/auction?join=${roomCode}`}
                                className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 font-mono text-sm focus:outline-none"
                            />
                            <button
                                onClick={() => navigator.clipboard.writeText(`http://localhost:3000/auction?join=${roomCode}`)}
                                className="px-6 bg-slate-800 hover:bg-slate-700 border border-gray-600 rounded-lg font-bold transition"
                            >
                                <i className="far fa-copy"></i>
                            </button>
                            <button className="px-6 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition text-white">
                                <i className="fab fa-whatsapp"></i>
                            </button>
                        </div>
                    </div>

                    {/* Lobby Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Participants List */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <i className="fas fa-users text-purple-400"></i> Joined Teams
                                </h3>
                                <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded-full">{playersJoined}/{totalPlayersLimit}</span>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide max-h-[300px]">
                                {/* We need to fetch participants list here. Using squads as proxy since loadSquads fetches summary which includes participants */}
                                {squads.length === 0 ? (
                                    <div className="text-gray-500 text-center italic py-10">Waiting for players to join...</div>
                                ) : (
                                    squads.map((s, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-black/30 p-3 rounded-lg border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-xs">
                                                    {s.team.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm">{s.team}</div>
                                                    <div className="text-[10px] text-gray-400">Manager joined</div>
                                                </div>
                                            </div>
                                            {s.team === team && <span className="text-[10px] bg-neon-cyan/20 text-neon-cyan px-2 py-0.5 rounded">YOU</span>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Host Controls */}
                        <div className="flex flex-col gap-4 justify-center">
                            {isHost ? (
                                <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-2xl p-6 text-center">
                                    <h3 className="text-xl font-bold mb-2">Host Controls</h3>
                                    <p className="text-gray-400 text-sm mb-6">Start the auction once everyone has joined.</p>

                                    <button
                                        onClick={startAuction}
                                        className="w-full py-4 bg-gradient-to-r from-neon-cyan to-blue-500 hover:from-white hover:to-blue-200 text-black font-black text-lg uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(0,247,255,0.4)] transition-all transform hover:scale-105"
                                    >
                                        Start Auction ⚡
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center flex flex-col items-center justify-center h-full">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 animate-pulse">
                                        <i className="fas fa-hourglass-half text-2xl text-yellow-500"></i>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Waiting for Host</h3>
                                    <p className="text-gray-400 text-sm">The host will start the auction shortly.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (status === "SELECTION") {
        return <QualificationScreen roomCode={roomCode} team={team} status={status} />;
    }

    if (status === "COMPLETED") {
        return <WinnerScreen roomCode={roomCode} />;
    }

    return (
        <div className="h-screen w-full bg-[#050505] p-2 md:p-6 lg:p-[50px] flex items-center justify-center overflow-hidden font-sans">
            {/* Game Container: Constrained height/width + Aspect Ratio to reduce empty space */}
            <div className="flex flex-col w-full max-w-[1600px] h-full max-h-[900px] aspect-video bg-[#0a0a0a] rounded-xl border border-gray-800 shadow-2xl overflow-hidden relative text-white text-xs">
                {/* Header */}
                <header className="flex justify-between items-center px-2 py-1 lg:px-4 lg:py-2 bg-black/40 border-b border-gray-800 shrink-0 min-h-[3rem] gap-2 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 lg:gap-4 shrink-0">
                        <div className="text-gray-400 font-medium text-[10px] lg:text-xs">Room: <span className="text-neon-cyan font-bold">{roomCode}</span></div>
                        <div className="text-gray-400 font-medium hidden sm:block text-[10px] lg:text-xs">Players: <span className="text-neon-cyan font-bold">{playersJoined}/{totalPlayersLimit}</span></div>
                    </div>
                    {isHost && (
                        <nav className="flex gap-1 lg:gap-3 shrink-0">
                            <button onClick={() => setShowSettings(true)} className="px-2 py-1 lg:px-3 rounded bg-black border border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,247,255,0.5)] transition uppercase text-[8px] lg:text-[10px] font-bold tracking-wider">
                                <i className="fas fa-cog"></i>
                            </button>
                            <button onClick={startAuction} className="px-2 py-1 lg:px-4 rounded bg-black border border-neon-cyan text-white hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,247,255,0.5)] transition uppercase text-[8px] lg:text-[10px] font-bold tracking-wider">
                                Start
                            </button>
                            <button onClick={pauseAuction} className={`px-2 py-1 lg:px-4 rounded bg-black border transition uppercase text-[8px] lg:text-[10px] font-bold tracking-wider ${isPaused ? 'border-yellow-500 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'border-neon-cyan text-white hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,247,255,0.5)]'}`}>
                                {isPaused ? "Resume" : "Pause"}
                            </button>
                            <button onClick={endAuction} className="px-2 py-1 lg:px-4 rounded bg-black border border-neon-cyan text-white hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,247,255,0.5)] transition uppercase text-[8px] lg:text-[10px] font-bold tracking-wider">
                                End
                            </button>
                            <button onClick={skipPlayer} className="px-2 py-1 lg:px-4 rounded bg-black border border-neon-cyan text-white hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,247,255,0.5)] transition uppercase text-[8px] lg:text-[10px] font-bold tracking-wider">
                                Skip
                            </button>
                        </nav>
                    )}

                    <div className="flex gap-2 items-center shrink-0">
                        {/* Voice Chat Toggle for Everyone */}
                        <button
                            onClick={() => setShowDiscord(!showDiscord)}
                            className={`px-2 py-0.5 lg:px-3 rounded border uppercase flex items-center gap-2 transition text-[8px] lg:text-[10px] ${showDiscord ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-transparent text-indigo-400 border-indigo-500 hover:text-white hover:bg-indigo-600'}`}
                        >
                            <i className="fab fa-discord"></i> <span className="hidden lg:inline">Voice</span>
                        </button>

                        {/* Sound Toggle */}
                        <button
                            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                            className={`px-2 py-0.5 lg:px-3 rounded border uppercase flex items-center gap-2 transition text-[8px] lg:text-[10px] ${isSoundEnabled ? 'bg-transparent text-green-400 border-green-500 hover:bg-green-500/10' : 'bg-red-500/20 text-red-400 border-red-500'}`}
                            title={isSoundEnabled ? "Mute Sound" : "Unmute Sound"}
                        >
                            <i className={`fas ${isSoundEnabled ? 'fa-volume-up' : 'fa-volume-mute'}`}></i>
                        </button>

                        <div className="flex items-center gap-2 ml-2 lg:ml-4">
                            <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-gray-700 flex items-center justify-center border border-neon-cyan shrink-0">
                                <i className="fas fa-user text-gray-300 text-[8px] lg:text-xs"></i>
                            </div>
                            <span className="font-semibold text-neon-cyan text-[8px] lg:text-xs truncate max-w-[60px] lg:max-w-none">{username} ({team})</span>
                        </div>
                    </div>
                </header>

                {/* Main Grid Content - 3 COLUMNS */}
                <main className="flex-1 p-2 overflow-hidden">
                    <div className="grid grid-cols-[30%_40%_30%] gap-2 h-full">

                        {/* COL 1: LEFT SIDE (Player + Squad) */}
                        <div className="flex flex-col gap-2 h-full min-h-0">
                            {/* MERGED PLAYER PROFILE - ID CARD STYLE */}
                            <div className="glass-panel relative overflow-hidden border border-neon-cyan/30 rounded-lg p-3 flex items-center gap-4 bg-gradient-to-br from-black to-[#0a0a0a] shrink-0">
                                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold z-10 ${status === 'BIDDING LIVE' ? 'bg-neon-cyan text-black' : 'bg-yellow-500 text-black'}`}>
                                    {status}
                                </div>

                                {/* Photo Card */}
                                <div className="w-[100px] h-[120px] lg:w-[120px] lg:h-[140px] bg-gradient-to-b from-gray-800 to-black rounded-lg border border-gray-700 shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden shrink-0 flex items-end justify-center group transform transition hover:scale-105 duration-300">
                                    <div className="absolute inset-0 bg-neon-cyan/5 group-hover:bg-neon-cyan/10 transition"></div>
                                    <i className="fas fa-user text-5xl lg:text-6xl text-gray-600 mb-4 group-hover:text-gray-500 transition"></i>
                                    <div className="absolute bottom-0 w-full bg-black/80 py-1 text-center text-[9px] text-neon-cyan border-t border-gray-800 font-bold tracking-wider">
                                        {player.role || "PLAYER"}
                                    </div>
                                </div>

                                {/* Details Section */}
                                <div className="flex-1 flex flex-col justify-center h-full space-y-2 lg:space-y-3">
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest">{player.country || "Unknown"}</div>
                                        <h1 className="text-xl lg:text-2xl font-black text-white uppercase italic leading-none truncate" title={player.name}>{player.name}</h1>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-2 lg:gap-x-4 gap-y-2">
                                        <div className="bg-white/5 p-1.5 rounded border border-white/10">
                                            <div className="text-[8px] text-gray-400 uppercase">Batting</div>
                                            <div className="text-xs lg:text-sm font-bold text-gray-200">{player.hand || "-"}</div>
                                        </div>
                                        <div className="bg-white/5 p-1.5 rounded border border-white/10">
                                            <div className="text-[8px] text-gray-400 uppercase">Bowling</div>
                                            <div className="text-xs lg:text-sm font-bold text-gray-200">{player.bowling || "-"}</div>
                                        </div>
                                        <div className="bg-white/5 p-1.5 rounded border border-white/10 col-span-2 flex justify-between items-end">
                                            <div>
                                                <div className="text-[8px] text-gray-400 uppercase">Base Price</div>
                                                <div className="text-sm lg:text-lg font-bold text-yellow-500 leading-none">{formatPrice(player.basePrice)}</div>
                                            </div>
                                            <div className="text-[9px] lg:text-[10px] text-gray-500">Age: <span className="text-white">{player.age || "-"}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SQUAD TABS */}
                            <div className="glass-panel flex flex-col overflow-hidden rounded-lg bg-black/20 border border-gray-700 relative flex-1 min-h-0">
                                {/* Tabs Header */}
                                <div className="flex border-b border-gray-700 bg-black/40">
                                    <button
                                        onClick={() => setSquadTab('my')}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition flex items-center justify-center gap-2 ${squadTab === 'my' ? 'bg-purple-900/60 text-white border-b-2 border-neon-cyan' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        <span>My Squad ({myTeamPlayers.length}/25)</span>
                                        <span className={`${myTeamPlayers.filter(p => p.country && p.country !== 'India').length >= 8 ? 'text-red-500' : 'text-gray-400'}`}>
                                            OS: {myTeamPlayers.filter(p => p.country && p.country !== 'India').length}/8
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => { setSquadTab('others'); loadSquadsData(); }}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition ${squadTab === 'others' ? 'bg-purple-900/60 text-white border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Leaderboard
                                    </button>
                                    <button
                                        onClick={() => { setSquadTab('unsold'); loadUnsoldPlayers(); }}
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase transition ${squadTab === 'unsold' ? 'bg-purple-900/60 text-white border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        Unsold
                                    </button>
                                </div>

                                <div className="flex-1 p-2 overflow-hidden relative">
                                    {/* MY SQUAD CONTENT */}
                                    {squadTab === 'my' && (
                                        <div className="h-full flex flex-col">
                                            <div className="grid grid-cols-3 gap-x-2 gap-y-1 content-start flex-1 overflow-y-auto pr-1">
                                                {Array.from({ length: 25 }).map((_, idx) => {
                                                    const p = myTeamPlayers[idx];
                                                    return (
                                                        <div key={idx} className={`flex items-center text-[10px] h-6 px-1.5 rounded border ${p ? 'bg-slate-800/80 border-gray-600' : 'bg-black/20 border-gray-800/50'}`}>
                                                            <span className="w-4 text-gray-500 font-mono text-[9px] mr-1">{idx + 1}.</span>
                                                            {p ? (
                                                                <span className="text-white font-bold truncate max-w-[80px]" title={p.name}>{p.name}</span>
                                                            ) : (
                                                                <span className="text-gray-800">-</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-2 pt-2 border-t-2 border-gray-800/50 shrink-0">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={fetchUpcomingPlayers}
                                                        className="p-3 rounded bg-slate-800/50 border border-gray-700 hover:bg-neon-cyan hover:text-black hover:border-neon-cyan transition flex flex-col items-center justify-center gap-1 group"
                                                    >
                                                        <i className="fa-regular fa-calendar-days text-purple-400 group-hover:text-black text-lg"></i>
                                                        <span className="font-bold text-gray-400 group-hover:text-black text-[9px] uppercase tracking-wider">Upcoming</span>
                                                    </button>
                                                    <button
                                                        onClick={() => { setSquadTab('others'); loadSquadsData(); }}
                                                        className="p-3 rounded bg-slate-800/50 border border-gray-700 hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition flex flex-col items-center justify-center gap-1 group"
                                                    >
                                                        <i className="fa-solid fa-trophy text-yellow-500 group-hover:text-black text-lg"></i>
                                                        <span className="font-bold text-gray-400 group-hover:text-black text-[9px] uppercase tracking-wider">Leaderboard</span>
                                                    </button>
                                                    {/* Placeholders for future buttons */}
                                                    <div className="p-3 rounded border border-transparent"></div>
                                                    <div className="p-3 rounded border border-transparent"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* LEADERBOARD & UNSOLD content reuse */}
                                    {/* Simplified here for brevity, assuming they fill parent similarly */}
                                    {squadTab === 'others' && (
                                        <div className="h-full overflow-y-auto scrollbar-hide space-y-4">
                                            {(() => {
                                                const { topPlayer, sortedTeams } = getLeaderboardStats();
                                                return (
                                                    <>
                                                        <div className="mb-2">
                                                            <div className="text-[9px] font-bold text-neon-cyan uppercase tracking-widest mb-1 border-b border-gray-800 pb-0.5">Highest Bids</div>
                                                            {topPlayer ? (
                                                                <div className="bg-slate-800/60 p-2 rounded flex justify-between items-center border border-neon-cyan/30">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center"><i className="fas fa-crown text-yellow-400 text-[10px]"></i></div>
                                                                        <div><div className="text-[10px] font-bold text-white">{topPlayer.name}</div><div className="text-[8px] text-gray-400">{topPlayer.team}</div></div>
                                                                    </div>
                                                                    <div className="text-neon-cyan font-bold text-xs">{formatPrice(topPlayer.price)}</div>
                                                                </div>
                                                            ) : <div className="text-[9px] text-gray-500 italic">No bids yet</div>}
                                                        </div>
                                                        <div>
                                                            <div className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest mb-1 border-b border-gray-800 pb-0.5">Top Spenders</div>
                                                            <div className="space-y-1">{sortedTeams.map((t, idx) => (
                                                                <div key={idx} className="flex justify-between items-center bg-black/20 p-1.5 rounded hover:bg-white/5 transition"><div className="flex items-center gap-2"><span className="text-[8px] text-gray-600 font-mono w-3">#{idx + 1}</span><span className={`text-[10px] font-bold ${t.team === team ? 'text-neon-cyan' : 'text-gray-300'}`}>{t.team}</span></div><div className="text-[9px]"><span className={`font-bold ${t.team === team ? 'text-neon-cyan' : 'text-yellow-400'}`}>{t.spent.toFixed(2)} Cr</span></div></div>
                                                            ))}</div>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {squadTab === 'unsold' && (
                                        <div className="h-full overflow-y-auto scrollbar-hide p-2 space-y-1">
                                            {unsoldPlayers.length === 0 ? <div className="text-gray-500 text-[10px] text-center italic mt-4">No unsold players yet</div> : unsoldPlayers.map((p, idx) => (
                                                <div key={idx} className={`bg-slate-900/50 p-1.5 rounded flex justify-between items-center text-[10px] border-l-2 ${p.status === 'SKIPPED' ? 'border-purple-500' : 'border-red-500'}`}><div><span className="text-white font-bold">{p.name}</span></div><div className="flex items-center gap-2"><span className={`text-[9px] font-bold px-1 rounded ${p.status === 'SKIPPED' ? 'bg-purple-900 text-purple-200' : 'bg-red-900 text-red-200'}`}>{p.status || 'UNSOLD'}</span></div></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* COL 2: CENTER (Bidding + Rivals) */}
                        <div className="flex flex-col gap-2 h-full min-h-0">
                            {/* BIDDING CONSOLE - REDESIGNED */}
                            <div className="glass-panel flex flex-col relative bg-black/20 rounded-lg border border-gray-800 shrink-0 shadow-lg">
                                {/* Timer Tag */}
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                                    <div className={`px-4 py-0.5 rounded-b-lg font-bold text-sm shadow-md ${timer <= 5 ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-800 text-neon-cyan border border-gray-600'}`}>
                                        {timer}s
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col items-center justify-center gap-1 border-b border-gray-800/50 bg-gradient-to-b from-gray-900/80 to-black rounded-t-lg pt-8">
                                    {/* DYNAMIC CONTENT SWITCHING: Price vs Status */}
                                    {!soldStatus ? (
                                        <>
                                            <div className="text-gray-500 text-[10px] uppercase tracking-[0.3em] mb-1">Current Bid</div>

                                            {/* Divider Line Top */}
                                            <div className="w-2/3 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>

                                            {/* Huge Price Display */}
                                            <div className="text-7xl font-black text-white drop-shadow-[0_0_20px_rgba(0,240,255,0.3)] tracking-tighter py-2 animate-in fade-in zoom-in duration-300">
                                                {formatPrice(currentBid || player.basePrice)}
                                            </div>

                                            {/* Divider Line Bottom */}
                                            <div className="w-2/3 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-2"></div>

                                            {/* Highest Bidder Indicator */}
                                            {highestBidder && (
                                                <div className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full ${highestBidder === team ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                                                    {highestBidder === team ? "You are leading" : `Leader: ${highestBidder}`}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center animate-in zoom-in duration-300 py-2">
                                            {/* Replaced Huge Text */}
                                            <div className={`text-6xl md:text-7xl font-black uppercase tracking-widest drop-shadow-[0_0_25px_rgba(255,255,255,0.2)] ${soldStatus.type === 'SOLD' ? 'text-neon-cyan' : 'text-red-500'}`}>
                                                {soldStatus.type}
                                            </div>

                                            {/* Sold Details Box */}
                                            {soldStatus.type === 'SOLD' && (
                                                <div className="mt-2 text-white text-xs font-bold bg-black/50 px-4 py-1.5 rounded border border-gray-700 shadow-lg">
                                                    Sold to <span className="text-neon-cyan text-sm ml-1">{soldStatus.team}</span> for <span className="text-yellow-500 text-sm ml-1">{formatPrice(soldStatus.price)}</span>
                                                </div>
                                            )}
                                            {soldStatus.type === 'UNSOLD' && <div className="mt-2 text-gray-500 text-[10px] uppercase tracking-widest">Better luck next time</div>}
                                            {soldStatus.type === 'SKIPPED' && <div className="mt-2 text-gray-500 text-[10px] uppercase tracking-widest">Player preserved for later</div>}
                                        </div>
                                    )}
                                </div>

                                {/* Bid Controls */}
                                <div className="p-3 bg-black/40 rounded-b-lg">
                                    <button
                                        onClick={placeBid}
                                        disabled={highestBidder === team || isPaused || !status.includes("LIVE") || !!soldStatus}
                                        className={`w-full py-3 rounded-md font-black text-xl uppercase tracking-widest transition shadow-[0_0_25px_rgba(0,240,255,0.1)]
                                            ${highestBidder === team || !!soldStatus
                                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                                : 'bg-neon-cyan text-black hover:bg-white hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] border-2 border-cyan-400'
                                            }`}
                                    >
                                        {soldStatus ? "AUCTION ENDED" : highestBidder === team ? "Leading" : `BID ${formatPrice(getNextBidAmount())}`}
                                    </button>
                                    <div className="flex justify-between mt-2 px-2 text-[10px] text-gray-500 font-mono font-bold">
                                        <span>WALLET: <span className="text-yellow-400">₹{userBudget.toFixed(2)}Cr</span></span>
                                        <span>INC: <span className="text-white">+{bidIncrement}L</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* RIVALS / COMPETITORS LIST (User Requested) */}
                            <div className="glass-panel flex-1 flex flex-col overflow-hidden rounded-lg bg-black/20 border border-gray-800 min-h-0 mt-1">
                                <div className="px-3 py-2 bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 flex justify-between items-center shrink-0">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider"><i className="fas fa-users text-purple-400 mr-1"></i> Active Squads</span>
                                    <span className="text-[9px] text-gray-600 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">Live</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-hide">
                                    {getLeaderboardStats().sortedTeams.map((t, idx) => {
                                        const isSelected = selectedSquad && selectedSquad.team === t.team;
                                        return (
                                            <div key={idx} className="flex flex-col gap-1">
                                                <div
                                                    onClick={() => setSelectedSquad(isSelected ? null : t)}
                                                    className={`flex justify-between items-center p-2 rounded border cursor-pointer transition ${isSelected ? 'bg-neon-cyan/10 border-neon-cyan/50' : 'bg-slate-900/30 border-gray-800 hover:bg-white/5 hover:border-gray-600'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[8px] font-mono text-gray-600 w-3">#{idx + 1}</div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[10px] font-bold ${t.team === team ? 'text-neon-cyan' : 'text-gray-200'}`}>{t.team}</span>
                                                            <span className="text-[8px] text-gray-500">Squad: <span className={t.players_count >= 25 ? 'text-green-500' : 'text-gray-300'}>{t.players_count}/25</span></span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-bold text-yellow-500">₹{t.budget_remaining.toFixed(2)}Cr</div>
                                                        <div className="text-[8px] text-gray-600 uppercase">Rem. Purse</div>
                                                    </div>
                                                </div>

                                                {/* ACCORDION DROPDOWN CONTENT */}
                                                {isSelected && (
                                                    <div className="bg-black/40 border-l border-b border-r border-gray-800 mx-1 rounded-b p-2 animate-in slide-in-from-top-2 duration-150">
                                                        {t.players.length === 0 ? (
                                                            <div className="text-[9px] text-gray-600 text-center italic">No players purchased yet</div>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                {t.players.map((p, i) => (
                                                                    <div key={i} className="flex justify-between items-center border-b border-gray-800/40 pb-1 last:border-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-1 h-3 rounded-full ${p.role === 'Batsman' ? 'bg-blue-500' : p.role === 'Bowler' ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                                                                            <span className="text-[9px] text-gray-300">{p.name}</span>
                                                                        </div>
                                                                        <span className="text-[9px] text-yellow-600 font-mono">₹{p.price.toString().replace('Cr', '')}L</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* COL 3: RIGHT SIDE (Merged Feed + Chat) */}
                        <div className="glass-panel flex flex-col overflow-hidden rounded-lg bg-black/20 border border-gray-800 h-full">
                            {/* Tabs Header */}
                            <div className="flex border-b border-gray-800 bg-black/40 text-[10px] font-bold uppercase tracking-wider shrink-0">
                                <button
                                    onClick={() => setFeedTab('feed')}
                                    className={`flex-1 py-2 flex items-center justify-center gap-2 hover:bg-white/5 transition ${feedTab === 'feed' ? 'text-neon-cyan border-b-2 border-neon-cyan bg-white/5' : 'text-gray-500'}`}
                                >
                                    <i className="fas fa-bolt text-yellow-500"></i> Live Feed
                                </button>
                                <button
                                    onClick={() => setFeedTab('chat')}
                                    className={`flex-1 py-2 flex items-center justify-center gap-2 hover:bg-white/5 transition ${feedTab === 'chat' ? 'text-neon-cyan border-b-2 border-neon-cyan bg-white/5' : 'text-gray-500'}`}
                                >
                                    <i className="fas fa-comments text-purple-400"></i> Chat
                                </button>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-hidden relative bg-black/10">
                                {/* FEED VIEW */}
                                {feedTab === 'feed' && (
                                    <div ref={liveFeedRef} className="absolute inset-0 overflow-y-auto p-2 space-y-1.5 scrollbar-hide">
                                        {liveFeed.map((item, idx) => (
                                            <div key={idx} className="bg-slate-900/50 p-1.5 rounded border-l-2 border-neon-cyan text-[10px] text-gray-300">
                                                {item.message}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* CHAT VIEW */}
                                {feedTab === 'chat' && (
                                    <div className="absolute inset-0 flex flex-col">
                                        <div ref={chatRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-hide">
                                            {chatMessages.map((msg, idx) => (
                                                <div key={idx} className="bg-slate-800/40 p-1.5 rounded text-[10px]">
                                                    <span className="text-neon-cyan font-bold block text-[9px]">{msg.sender}</span>
                                                    <span className="text-gray-300">{msg.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="p-1.5 bg-black/30 flex gap-1 border-t border-gray-800">
                                            <input
                                                className="flex-1 bg-slate-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-neon-cyan"
                                                placeholder="Msg..."
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                                            />
                                            <button onClick={sendMessage} className="px-3 bg-neon-cyan text-black font-bold text-[10px] rounded hover:bg-cyan-300">
                                                <i className="fas fa-paper-plane"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </main >

                {/* Modals kept same but scaled down if needed - keeping logic simple for now */}
                {
                    showUpcoming && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center">
                            <div className="bg-[#0f172a] border border-neon-cyan rounded-xl w-[500px] max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.2)]">
                                <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-white">Upcoming</h2>
                                    <button onClick={() => setShowUpcoming(false)} className="text-gray-400 hover:text-white">&times;</button>
                                </div>
                                <div className="p-3 overflow-y-auto flex-1 space-y-4 scrollbar-hide">
                                    {Object.entries(upcomingPlayers.reduce((acc, p) => {
                                        (acc[p.set_no] = acc[p.set_no] || []).push(p);
                                        return acc;
                                    }, {})).map(([setNo, players]) => (
                                        <div key={setNo}>
                                            <div className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-1 sticky top-0 bg-[#0f172a] py-1 border-b border-gray-800">
                                                Set {setNo}
                                            </div>
                                            <div className="space-y-1">
                                                {players.map((p) => (
                                                    <div key={p.id} className="bg-slate-800 p-2 rounded border border-gray-700 flex justify-between items-center text-xs">
                                                        <div><div className="font-bold text-white">{p.name}</div><div className="text-[10px] text-gray-400">{p.role} • {p.country}</div></div>
                                                        <div className="text-right"><div className="text-neon-cyan font-bold">{formatPrice(p.base_price)}</div></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* LEADERBOARD  */}
                {
                    showSquads && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center">
                            <div className="bg-[#0f172a] border border-neon-cyan rounded-xl w-[600px] max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.2)]">
                                <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                                    <h2 className="text-lg font-bold text-white">Leaderboard</h2>
                                    <button onClick={() => setShowSquads(false)} className="text-gray-400 hover:text-white">&times;</button>
                                </div>
                                <div className="p-3 overflow-y-auto flex-1 space-y-2 scrollbar-hide">
                                    {squads.map((teamData) => {
                                        const { spent, osCount } = getSquadDetails(teamData);
                                        const isExpanded = expandedTeam === teamData.team;
                                        return (
                                            <div key={teamData.team} className="bg-slate-800 border border-gray-700 rounded-lg overflow-hidden text-xs">
                                                <div className="p-3 cursor-pointer flex justify-between items-center hover:bg-slate-700/50" onClick={() => setExpandedTeam(isExpanded ? null : teamData.team)}>
                                                    <div className="flex items-center gap-2"><div className={`font-bold ${teamData.team === team ? 'text-neon-cyan' : 'text-white'}`}>{teamData.team}</div></div>
                                                    <div className="flex gap-3 text-[10px]"><span className="text-gray-400">OS: {osCount}</span><span className="text-yellow-400 font-bold">Purse: {teamData.budget_remaining.toFixed(2)} Cr</span></div>
                                                </div>
                                                {isExpanded && (
                                                    <div className="p-3 bg-black/20 border-t border-gray-700">
                                                        <div className="flex justify-between text-[10px] text-gray-500 mb-2"><span>Count: {teamData.players_count}/25</span><span>Spent: {spent.toFixed(2)} Cr</span></div>
                                                        <div className="grid grid-cols-2 gap-1">{teamData.players.map((p, idx) => (<div key={idx} className="bg-slate-900/50 p-1.5 rounded flex justify-between items-center text-[10px] border-l border-neon-cyan"><span className="text-white">{p.name}</span><span className="text-gray-400">{formatPrice(p.price)}</span></div>))}</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* SETTINGS */}
                {
                    showSettings && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center">
                            <div className="bg-[#0f172a] border border-neon-cyan rounded-xl w-[400px] flex flex-col shadow-[0_0_50px_rgba(0,240,255,0.2)]">
                                <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                                    <h2 className="text-md font-bold text-white">Settings</h2>
                                    <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">&times;</button>
                                </div>
                                <div className="p-4">
                                    <label className="block text-gray-400 text-xs mb-2">Bid Timer (Seconds)</label>
                                    <div className="flex gap-2 mb-4">
                                        {[10, 15, 20, 30, 45, 60].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => updateSettings(val)}
                                                className={`px-3 py-1 rounded border ${defaultTimer === val ? 'bg-neon-cyan text-black border-neon-cyan' : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'}`}
                                            >
                                                {val}s
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-[10px] text-gray-500">Changes apply to next player.</div>
                                </div>
                            </div>
                        </div>
                    )
                }


                {/* DISCORD WIDGET OVERLAY */}
                {showDiscord && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center">
                        <div className="relative animate-in zoom-in duration-200">
                            <button
                                onClick={() => setShowDiscord(false)}
                                className="absolute -top-12 right-0 text-white hover:text-red-400 font-bold bg-black/80 px-3 py-1.5 rounded-full border border-gray-600 flex items-center gap-2 transition"
                            >
                                <span className="text-xs uppercase">Close</span> &times;
                            </button>
                            <DiscordWidget />
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

export default AuctionRoom;
