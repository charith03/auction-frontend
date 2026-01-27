import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import QualificationScreen from "./PostAuction/QualificationScreen";
import WinnerScreen from "./PostAuction/WinnerScreen";

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

    const liveFeedRef = useRef(null);
    const chatRef = useRef(null);
    const lastBidRef = useRef(0);
    const lastBidderRef = useRef(null);
    const lastPlayerRef = useRef(null);
    const lastSoldPlayerRef = useRef(null);

    // Format price
    const formatPrice = (lakhs) => {
        if (lakhs >= 100) {
            const crores = lakhs / 100;
            return `₹${crores.toFixed(2)} Cr`;
        }
        return `₹${lakhs}L`;
    };

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

                    if (data.current_bid !== lastBidRef.current || data.highest_bidder !== lastBidderRef.current) {
                        setCurrentBid(data.current_bid);
                        setHighestBidder(data.highest_bidder);
                        setSoldStatus(null);

                        if (data.highest_bidder) {
                            addToLiveFeed(`🏏 ${data.highest_bidder} bid ${formatPrice(data.current_bid)}`);
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
                                addToLiveFeed(`🏆 ${data.current_player.name} SOLD to ${data.sold_team} for ${formatPrice(data.sold_price)}!`);
                            } else if (data.sold_status === 'UNSOLD') {
                                setSoldStatus({ type: 'UNSOLD' });
                                addToLiveFeed(`❌ ${data.current_player.name} went UNSOLD`);
                            } else if (data.sold_status === 'SKIPPED') {
                                setSoldStatus({ type: 'SKIPPED' });
                                addToLiveFeed(`⏭️ ${data.current_player.name} SKIPPED`);
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

    const startAuction = async () => { try { await axios.post("http://127.0.0.1:8000/api/start-auction/", { code: roomCode }); addToLiveFeed("🎬 Auction Started!"); } catch (err) { console.error("Start failed:", err); alert(err.response?.data?.error || "Start failed"); } };
    const pauseAuction = async () => { try { await axios.post("http://127.0.0.1:8000/api/pause-auction/", { code: roomCode }); addToLiveFeed(isPaused ? "▶️ Auction Resumed" : "⏸️ Auction Paused"); } catch (err) { console.error("Pause failed:", err); alert(err.response?.data?.error || "Pause failed"); } };
    const skipPlayer = async () => { try { await axios.post("http://127.0.0.1:8000/api/skip-player/", { code: roomCode }); } catch (err) { console.error("Skip failed:", err); alert(err.response?.data?.error || "Skip failed"); } };
    const endAuction = async () => { try { await axios.post("http://127.0.0.1:8000/api/end-auction/", { code: roomCode }); } catch (err) { console.error("End failed:", err); alert(err.response?.data?.error || "End failed"); } };
    const sendMessage = async () => { if (!chatInput.trim()) return; try { await axios.post("http://127.0.0.1:8000/api/send-message/", { code: roomCode, sender: username, message: chatInput }); setChatInput(""); } catch (err) { console.error("Chat failed:", err); } };

    const [upcomingPlayers, setUpcomingPlayers] = useState([]);
    const [unsoldPlayers, setUnsoldPlayers] = useState([]);
    const [showUpcoming, setShowUpcoming] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
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

    if (status === "SELECTION") {
        return <QualificationScreen roomCode={roomCode} team={team} status={status} />;
    }

    if (status === "COMPLETED") {
        return <WinnerScreen roomCode={roomCode} />;
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden text-white font-sans text-xs bg-[#0a0a0a]">
            {/* Header */}
            <header className="flex justify-between items-center px-4 py-1 bg-black/40 border-b border-gray-800 shrink-0 h-10">
                <div className="flex gap-4">
                    <div className="text-gray-400 font-medium">Room: <span className="text-neon-cyan font-bold">{roomCode}</span></div>
                    <div className="text-gray-400 font-medium hidden sm:block">Players: <span className="text-neon-cyan font-bold">{playersJoined}/{totalPlayersLimit}</span></div>
                </div>
                {isHost && (
                    <nav className="flex gap-2">
                        <button onClick={() => setShowSettings(true)} className="px-3 py-0.5 rounded shadow-neon-soft hover:bg-neon-cyan hover:text-black border border-[#00f7ff] uppercase">⚙</button>
                        <button onClick={startAuction} className="px-3 py-0.5 rounded shadow-neon-soft hover:bg-neon-cyan hover:text-black border border-[#00f7ff] uppercase">Start</button>
                        <button onClick={pauseAuction} className={`px-3 py-0.5 rounded shadow-neon-soft hover:bg-neon-cyan hover:text-black border border-[#00f7ff] uppercase ${isPaused ? 'bg-yellow-500/20' : ''}`}>{isPaused ? "Resume" : "Pause"}</button>
                        <button onClick={endAuction} className="px-3 py-0.5 rounded shadow-neon-soft hover:bg-neon-cyan hover:text-black border border-[#00f7ff] uppercase">End</button>
                        <button onClick={skipPlayer} className="px-3 py-0.5 rounded shadow-neon-soft hover:bg-neon-cyan hover:text-black border border-[#00f7ff] uppercase">Skip</button>
                    </nav>
                )}
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center border border-neon-cyan">
                        <i className="fas fa-user text-gray-300 text-xs"></i>
                    </div>
                    <span className="font-semibold text-neon-cyan">{username} ({team})</span>
                </div>
            </header>

            {/* Main Grid Content */}
            <main className="flex-1 p-2 grid grid-rows-[45%_55%] gap-2 overflow-hidden">

                {/* UP ROW: Player (Left), Bidding (Center), Feed (Right) */}
                <div className="grid grid-cols-[30%_40%_30%] gap-2 h-full min-h-0">

                    {/* COL 1: MERGED PLAYER PROFILE */}
                    <div className="glass-panel flex flex-col relative overflow-hidden border border-neon-cyan/30 rounded-lg">
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold z-10 ${status === 'BIDDING LIVE' ? 'bg-neon-cyan text-black' : 'bg-yellow-500 text-black'}`}>
                            {status}
                        </div>
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded text-[10px] border border-gray-600">
                            {player.country}
                        </div>

                        <div className="flex flex-row h-full">
                            {/* Left Half: Photo/Cutout */}
                            <div className="w-[40%] bg-gradient-to-b from-slate-800 to-black flex items-end justify-center relative border-r border-gray-800">
                                <div className="absolute inset-0 bg-neon-cyan/5 blur-lg"></div>
                                <i className="fas fa-user text-6xl text-gray-500 mb-6 z-10"></i>
                                <div className="absolute bottom-2 text-center w-full">
                                    <span className="text-[9px] bg-black/50 px-2 py-0.5 rounded text-neon-cyan uppercase tracking-widest">{player.role}</span>
                                </div>
                            </div>

                            {/* Right Half: Details */}
                            <div className="w-[60%] p-3 flex flex-col justify-center bg-black/20">
                                <h1 className="text-xl font-bold text-white uppercase leading-tight mb-1">{player.name}</h1>

                                <div className="space-y-2 mt-2">
                                    <div className="flex justify-between items-center border-b border-gray-800 pb-1">
                                        <span className="text-gray-500 text-[9px] uppercase">Batting</span>
                                        <span className="text-gray-200 font-bold">{player.hand || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-800 pb-1">
                                        <span className="text-gray-500 text-[9px] uppercase">Bowling</span>
                                        <span className="text-gray-200 font-bold">{player.bowling || "-"}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-800 pb-1">
                                        <span className="text-gray-500 text-[9px] uppercase">Age</span>
                                        <span className="text-gray-200 font-bold">{player.age || "-"}</span>
                                    </div>

                                    <div className="mt-3 pt-2">
                                        <div className="text-gray-500 text-[9px] uppercase mb-0.5">Base Price</div>
                                        <div className="text-xl font-bold text-yellow-500">{formatPrice(player.basePrice)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* COL 2: BIDDING CONSOLE */}
                    <div className="glass-panel flex flex-col items-center justify-center p-2 relative bg-black/20 rounded-lg border border-gray-800">
                        {/* Timer */}
                        <div className="absolute top-0 w-full flex justify-center">
                            <div className={`px-4 py-1 rounded-b-lg font-bold text-xl ${timer < 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-neon-cyan border-b border-custom-cyan'}`}>
                                {timer}s
                            </div>
                        </div>

                        {/* Bid Display */}
                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                            {soldStatus ? (
                                <div className="text-center animate-bounce">
                                    <div className={`text-3xl font-black mb-1 ${soldStatus.type === 'SOLD' ? 'text-neon-cyan' : soldStatus.type === 'UNSOLD' ? 'text-red-500' : 'text-purple-500'}`}>
                                        {soldStatus.type}
                                    </div>
                                    {soldStatus.type === 'SOLD' && (
                                        <>
                                            <div className="text-white text-lg">to {soldStatus.team}</div>
                                            <div className="text-yellow-400 font-bold text-lg">{formatPrice(soldStatus.price)}</div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Current Bid</div>
                                    <div className="text-5xl font-black text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                                        {formatPrice(currentBid || player.basePrice)}
                                    </div>
                                    {highestBidder && <div className="text-green-500 font-bold mt-1 text-xs">Highest: {highestBidder}</div>}
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        {!soldStatus && (
                            <div className="w-full px-4 mb-2">
                                <button
                                    onClick={placeBid}
                                    disabled={highestBidder === team || isPaused || !status.includes("LIVE")}
                                    className={`w-full py-2 rounded font-bold text-sm uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,240,255,0.2)]
                                        ${highestBidder === team ? 'bg-gray-600 cursor-not-allowed text-gray-300' : 'bg-neon-cyan text-black hover:bg-white hover:scale-[1.02]'}
                                    `}
                                >
                                    {highestBidder === team ? "You Lead" : `Bid ${formatPrice(getNextBidAmount())}`}
                                </button>
                                <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                                    <span>Budget: <span className="text-yellow-400 font-bold">₹{userBudget.toFixed(2)}Cr</span></span>
                                    <span>Next: {bidIncrement}L</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COL 3: LIVE FEED */}
                    <div className="glass-panel flex flex-col overflow-hidden rounded-lg bg-black/20 border border-gray-800">
                        <div className="bg-black/30 p-2 border-b border-gray-800 font-bold text-gray-400 text-[10px] uppercase">
                            <i className="fas fa-bolt text-yellow-500 mr-1"></i> Live Feed
                        </div>
                        <div ref={liveFeedRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-hide">
                            {liveFeed.map((item, idx) => (
                                <div key={idx} className="bg-slate-900/50 p-1.5 rounded border-l-2 border-neon-cyan text-[10px] text-gray-300">
                                    {item.message}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW: Squad (Left), Buttons (Center), Chat (Right) */}
                <div className="grid grid-cols-[30%_40%_30%] gap-2 h-full min-h-0">

                    {/* COL 1: SQUAD TABS (My Squad / View Others) */}
                    <div className="glass-panel flex flex-col overflow-hidden rounded-lg bg-black/20 border border-gray-700 relative">
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
                                <div className="h-full flex gap-2 p-2">
                                    {[0, 1, 2].map(colIndex => {
                                        const startIdx = colIndex * 10;
                                        const endIdx = colIndex === 2 ? 25 : startIdx + 10; // Col 3 is shorter
                                        const colSlots = Array.from({ length: endIdx - startIdx }, (_, i) => startIdx + i);

                                        return (
                                            <div key={colIndex} className="flex-1 flex flex-col gap-1">
                                                {colSlots.map(slotIdx => {
                                                    const p = myTeamPlayers[slotIdx];
                                                    return (
                                                        <div key={slotIdx} className="flex items-center text-[10px] h-5 truncate">
                                                            <span className="w-5 text-gray-500 text-right mr-2 font-mono">{slotIdx + 1}.</span>
                                                            {p ? (
                                                                <span className="text-white font-bold truncate" title={p.name}>{p.name}</span>
                                                            ) : (
                                                                <span className="text-gray-700">-</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* LEADERBOARD CONTENT (NEW) */}
                            {squadTab === 'others' && (
                                <div className="h-full overflow-y-auto scrollbar-hide space-y-4">
                                    {(() => {
                                        const { topPlayer, sortedTeams } = getLeaderboardStats();
                                        return (
                                            <>
                                                {/* Top Buys Section */}
                                                <div className="mb-2">
                                                    <div className="text-[9px] font-bold text-neon-cyan uppercase tracking-widest mb-1 border-b border-gray-800 pb-0.5">Highest Bids</div>
                                                    {topPlayer ? (
                                                        <div className="bg-slate-800/60 p-2 rounded flex justify-between items-center border border-neon-cyan/30">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center"><i className="fas fa-crown text-yellow-400 text-[10px]"></i></div>
                                                                <div>
                                                                    <div className="text-[10px] font-bold text-white">{topPlayer.name}</div>
                                                                    <div className="text-[8px] text-gray-400">{topPlayer.team}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-neon-cyan font-bold text-xs">{formatPrice(topPlayer.price)}</div>
                                                        </div>
                                                    ) : <div className="text-[9px] text-gray-500 italic">No bids yet</div>}
                                                </div>

                                                {/* Teams Ranking Section */}
                                                <div>
                                                    <div className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest mb-1 border-b border-gray-800 pb-0.5">Top Spenders</div>
                                                    <div className="space-y-1">
                                                        {sortedTeams.map((t, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-black/20 p-1.5 rounded hover:bg-white/5 transition border-l-2 border-transparent hover:border-yellow-500">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[8px] text-gray-600 font-mono w-3">#{idx + 1}</span>
                                                                    <span className={`text-[10px] font-bold ${t.team === team ? 'text-neon-cyan' : 'text-gray-300'}`}>{t.team}</span>
                                                                </div>
                                                                <div className="text-[9px]">
                                                                    <span className="text-gray-500 mr-2">Spent:</span>
                                                                    <span className={`font-bold ${t.team === team ? 'text-neon-cyan' : 'text-yellow-400'}`}>{t.spent.toFixed(2)} Cr</span>
                                                                    <span className="text-gray-600 ml-1">({t.players_count}/25)</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* UNSOLD CONTENT */}
                            {squadTab === 'unsold' && (
                                <div className="h-full overflow-y-auto scrollbar-hide p-2 space-y-1">
                                    {unsoldPlayers.length === 0 ? (
                                        <div className="text-gray-500 text-[10px] text-center italic mt-4">No unsold players yet</div>
                                    ) : (
                                        unsoldPlayers.map((p, idx) => (
                                            <div key={idx} className={`bg-slate-900/50 p-1.5 rounded flex justify-between items-center text-[10px] border-l-2 ${p.status === 'SKIPPED' ? 'border-purple-500' : 'border-red-500'}`}>
                                                <div>
                                                    <span className="text-white font-bold">{p.name}</span>
                                                    <span className="text-gray-500 ml-2">{p.role}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] font-bold px-1 rounded ${p.status === 'SKIPPED' ? 'bg-purple-900 text-purple-200' : 'bg-red-900 text-red-200'}`}>{p.status || 'UNSOLD'}</span>
                                                    <span className="text-gray-400">{formatPrice(p.base_price)}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COL 2: ACTION BUTTONS CENTER */}
                    <div className="flex flex-col gap-2 justify-center px-8">
                        <button onClick={fetchUpcomingPlayers} className="p-3 bg-gray-800 border border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-400 transition flex items-center justify-center gap-2 group">
                            <i className="fa-regular fa-calendar-days text-purple-400 group-hover:scale-110 transition-transform"></i>
                            <span className="font-bold text-gray-300 group-hover:text-white">Upcoming Players</span>
                        </button>
                        <button onClick={() => { setSquadTab('others'); loadSquadsData(); }} className="p-3 bg-gray-800 border-gray-600 rounded-lg hover:bg-gray-700 hover:border-gray-400 transition flex items-center justify-center gap-2 group">
                            <i className="fa-solid fa-trophy text-yellow-400 group-hover:scale-110 transition-transform"></i>
                            <span className="font-bold text-gray-300 group-hover:text-white">Leaderboard</span>
                        </button>
                        <div className="text-center mt-2 text-gray-600 text-[9px] uppercase tracking-widest">
                            Neon Auction v2.0
                        </div>
                    </div>

                    {/* COL 3: CHAT */}
                    <div className="glass-panel flex flex-col overflow-hidden rounded-lg bg-black/20 border border-gray-800">
                        <div className="bg-black/30 p-2 border-b border-gray-800 font-bold text-gray-400 text-[10px] uppercase">
                            Room Chat
                        </div>
                        <div ref={chatRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-hide bg-black/10">
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
                                <div className="mb-2"><label className="block text-gray-400 text-xs mb-1 uppercase">Timer</label><div className="flex gap-1">{[5, 10, 15, 20, 25].map((val) => (<button key={val} onClick={() => updateSettings(val)} className={`flex-1 py-1 rounded border text-xs ${defaultTimer === val ? 'bg-neon-cyan text-black border-neon-cyan' : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'}`}>{val}s</button>))}</div></div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default AuctionRoom;
