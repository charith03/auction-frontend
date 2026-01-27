import React, { useEffect, useState } from 'react';
import SelectionScreen from './SelectionScreen';
import WinnerScreen from './WinnerScreen';

function QualificationScreen({ roomCode, team, status }) {
    const [isQualified, setIsQualified] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check qualification status
        fetch(`http://127.0.0.1:8000/api/check-qualification/${roomCode}/`)
            .then(res => res.json())
            .then(data => {
                const myStatus = data.find(d => d.team === team);
                if (myStatus) {
                    setIsQualified(myStatus.status === 'QUALIFIED');
                }
                setLoading(false);
            })
            .catch(err => setLoading(false));

        // If room moves to COMPLETED, we don't handle it here (parent handles it)
    }, [roomCode, team]);

    if (loading) return <div className="text-white text-center mt-20">Checking Qualification...</div>;

    if (!isQualified) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white">
                <div className="text-6xl mb-4">💔</div>
                <h1 className="text-3xl font-bold text-red-500 mb-2">ELIMINATED</h1>
                <p className="text-gray-400">Your squad does not have the minimum 18 players.</p>
                <div className="mt-8 p-4 bg-slate-900 rounded border border-gray-700">
                    <h3 className="text-lg font-bold text-yellow-500 mb-2">Spectator Mode</h3>
                    <p className="text-sm">You can watch the Winner Declaration shortly.</p>
                </div>
            </div>
        );
    }

    // If Qualified, Show Selection Screen
    return <SelectionScreen roomCode={roomCode} team={team} />;
}

export default QualificationScreen;
