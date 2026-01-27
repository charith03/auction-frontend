import React, { useEffect, useState } from 'react';
import axios from 'axios';

function WinnerScreen({ roomCode }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWinner = async () => {
            try {
                const res = await axios.get(`http://127.0.0.1:8000/api/winner/${roomCode}/`);
                setLeaderboard(res.data);
                setLoading(false);
            } catch (err) {
                // Poll until available
                setTimeout(fetchWinner, 2000);
            }
        };
        fetchWinner();
    }, [roomCode]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-500 animate-pulse">
                    CALCULATING RESULTS...
                </h1>
            </div>
        );
    }

    const winner = leaderboard[0];

    return (
        <div className="flex flex-col items-center justify-center h-full text-white bg-slate-900 relative overflow-hidden">
            {/* Confetti Background (Simple CSS Circles) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{
                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                        animationDuration: `${Math.random() * 2 + 1}s`
                    }}></div>
                ))}
            </div>

            <div className="z-10 text-center mb-8">
                <div className="text-yellow-400 text-6xl mb-4 animate-bounce">👑</div>
                <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest">The Winner Is</h2>
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 drop-shadow-lg mt-2">
                    {winner?.team}
                </h1>
                <p className="text-gray-400 mt-2 font-mono">Manager: {winner?.username}</p>
            </div>

            <div className="z-10 w-full max-w-md bg-black/40 backdrop-blur rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-3 bg-black/60 font-bold text-center border-b border-gray-700 text-neon-cyan uppercase tracking-widest text-xs">
                    Final Standings
                </div>
                <div className="flex flex-col">
                    {leaderboard.map((team, idx) => (
                        <div key={idx} className={`flex justify-between items-center p-4 border-b border-gray-800 ${idx === 0 ? 'bg-yellow-500/10' : ''}`}>
                            <div className="flex items-center gap-4">
                                <span className={`font-mono font-bold text-xl w-8 ${idx === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>#{idx + 1}</span>
                                <div>
                                    <div className={`font-bold ${idx === 0 ? 'text-white' : 'text-gray-300'}`}>{team.team}</div>
                                    <div className="text-[10px] text-gray-500">{team.username}</div>
                                </div>
                            </div>
                            <div className="font-mono font-bold text-neon-cyan text-lg">
                                {team.score.toFixed(1)} <span className="text-[10px] text-gray-500">PTS</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scoring Breakdown Info */}
            <div className="mt-6 p-4 max-w-2xl text-center z-10">
                <h3 className="text-neon-cyan font-bold uppercase tracking-widest text-xs mb-2">How Points Were Calculated</h3>
                <div className="grid grid-cols-3 gap-2 text-[10px] text-gray-400">
                    <div className="bg-black/40 p-2 rounded border border-gray-800">
                        <strong className="block text-white mb-1">Player Power Index (PPI)</strong>
                        Calculated based on Base Price, Role, and Hidden Potential.
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-gray-800">
                        <strong className="block text-white mb-1">Squad Balance</strong>
                        Bonus points for strong Batting & Bowling depth.
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-gray-800">
                        <strong className="block text-red-400 mb-1">Penalties</strong>
                        -50 pts if No Wicket Keeper.<br />-10 pts for every Bowler missing (min 5).
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WinnerScreen;
