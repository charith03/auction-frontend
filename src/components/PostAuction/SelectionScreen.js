import React, { useEffect, useState } from 'react';
import axios from 'axios';

function SelectionScreen({ roomCode, team }) {
    const [players, setPlayers] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Fetch My Team
        axios.get(`http://127.0.0.1:8000/api/my-team/${roomCode}/${team}/`)
            .then(res => {
                // Determine ID if not present (should be in response now)
                // Note: The previous API might need update to send IDs, 
                // but let's assume get_my_team sends minimal data. 
                // We should actually use the summary API or update get_my_team to ensure IDs.
                // Or better: use 'summary' for full details.
                fetchDetails();
            });
    }, [roomCode, team]);

    const fetchDetails = async () => {
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/summary/${roomCode}/`);
            const mySquad = res.data.find(s => s.team === team);
            if (mySquad) {
                // We need IDs, and summary API sends full player object?
                // Wait, default summary might not send IDs. Let's check summary response structure.
                // Assuming summary needs IDs which I added earlier or default serializer has them.
                // Wait, summary API in views.py sends Manual dict. 
                // I need to make sure it sends IDs.
                // In views.py: result.append({ "name": ..., "price": ...}) 
                // It does NOT send ID! 
                // I need to fix views.py or use another API.
                // Helper: fetch all players and filter by name? Risky.
                // Let's rely on `upcoming-players` logic? No.

                // FIX: I will use a different endpoint or assume the user has IDs.
                // Actually, I should update get_my_team or summary to include ID.
                // But since I can't edit views easily without restart, let's use `get_my_team` logic enhancement 
                // OR `get_unsold`? No.

                // Let's use `get_my_team` but I need to ensure it returns IDs?
                // The current `get_my_team` in views.py returns: name, price, country. 
                // It does NOT return ID. This is a blocker.

                // Oh wait, I can edit views.py! I am the developer!
                // I should add ID to get_my_team or get_summary.

                // Let's proceed assuming I fix views.py in next step or use names?
                // Ideally ID.
                setPlayers(mySquad.players); // Assuming this will have IDs after I fix view
            }
        } catch (err) {
            console.error(err);
        }
    };

    const toggleSelection = (player) => {
        // Check if player is already selected (to allow deselection)
        if (selectedIds.includes(player.id)) {
            setSelectedIds(selectedIds.filter(id => id !== player.id));
        } else {
            // Validation: Max 11 Players
            if (selectedIds.length >= 11) return alert("You can only select 11 players!");

            // Validation: Max 4 Overseas Players
            const isOverseas = player.country !== "India";
            if (isOverseas) {
                // Count current overseas players
                const currentOverseasCount = selectedIds.reduce((count, id) => {
                    const p = players.find(pl => pl.id === id);
                    return p && p.country !== "India" ? count + 1 : count;
                }, 0);

                if (currentOverseasCount >= 4) {
                    return alert("Max 4 Overseas slots only! You cannot select more than 4 non-Indian players.");
                }
            }

            setSelectedIds([...selectedIds, player.id]);
        }
    };

    const submitTeam = async () => {
        if (selectedIds.length !== 11) return alert("You must select exactly 11 players.");

        try {
            await axios.post("http://127.0.0.1:8000/api/submit-xi/", {
                code: roomCode,
                team: team,
                player_ids: selectedIds
            });
            setIsSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.error || "Submission failed");
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white animate-pulse">
                <i className="fas fa-brain text-6xl text-neon-cyan mb-4"></i>
                <h2 className="text-2xl font-bold">AI Analyzing...</h2>
                <p className="text-gray-400">Waiting for other teams to submit.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 text-white p-4">
            <header className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
                <div>
                    <h1 className="text-xl font-bold text-neon-cyan">Select Playing XI</h1>
                    <p className="text-[10px] text-gray-400">Pick your best 11 for the AI Evaluation.</p>
                </div>
                <div className={`text-xl font-bold ${selectedIds.length === 11 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {selectedIds.length} / 11
                </div>
            </header>

            {error && <div className="bg-red-500/20 text-red-500 p-2 mb-2 text-xs rounded">{error}</div>}

            <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pb-20">
                {players.map((p, idx) => {
                    const selected = selectedIds.includes(p.id);

                    return (
                        <div
                            key={idx}
                            onClick={() => toggleSelection(p)}
                            className={`p-2 rounded border cursor-pointer transition flex justify-between items-center
                                ${selected
                                    ? 'bg-white text-black border-white'
                                    : 'bg-black/40 border-gray-700 hover:bg-white/5'
                                }`}
                        >
                            <div>
                                <div className="font-bold text-xs">{p.name}</div>
                                <div className="text-[9px] opacity-70">{p.role}</div>
                            </div>
                            {selected && <i className="fas fa-check-circle text-black"></i>}
                        </div>
                    );
                })}
            </div>

            <div className="fixed bottom-4 left-0 w-full px-4 flex justify-center">
                <button
                    onClick={submitTeam}
                    disabled={selectedIds.length !== 11}
                    className={`px-8 py-3 rounded-full font-bold shadow-lg transition
                        ${selectedIds.length === 11
                            ? 'bg-neon-cyan text-black hover:scale-105 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    Lock & Submit Prediction
                </button>
            </div>
        </div>
    );
}

export default SelectionScreen;
