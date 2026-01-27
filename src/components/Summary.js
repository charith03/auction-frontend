import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Summary() {
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const roomCode = localStorage.getItem("roomCode");
    const navigate = useNavigate();

    useEffect(() => {
        if (!roomCode) {
            navigate("/");
            return;
        }

        // Fetch summary data
        axios.get(`http://127.0.0.1:8000/api/summary/${roomCode}/`)
            .then(res => {
                setSummaryData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch summary:", err);
                setLoading(false);
            });
    }, [roomCode, navigate]);

    const formatPrice = (lakhs) => {
        if (lakhs >= 100) {
            const crores = lakhs / 100;
            return `₹${crores.toFixed(2)} Cr`;
        }
        return `₹${lakhs}L`;
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <div style={styles.loading}>Loading summary...</div>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <h1 style={styles.title}>🏆 Auction Summary</h1>
                <div style={styles.roomCode}>Room: {roomCode}</div>
            </header>

            <div style={styles.container}>
                {summaryData.map((teamData, idx) => (
                    <div key={idx} style={styles.teamCard}>
                        <div style={styles.teamHeader}>
                            <h2 style={styles.teamName}>{teamData.team}</h2>
                            <div style={styles.teamStats}>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Players:</span>
                                    <span style={styles.statValue}>{teamData.players_count}</span>
                                </div>
                                <div style={styles.statItem}>
                                    <span style={styles.statLabel}>Budget Left:</span>
                                    <span style={styles.statValue}>₹{teamData.budget_remaining.toFixed(2)} Cr</span>
                                </div>
                            </div>
                        </div>

                        <div style={styles.playersContainer}>
                            {teamData.players.length === 0 ? (
                                <div style={styles.noPlayers}>No players purchased</div>
                            ) : (
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>#</th>
                                            <th style={styles.th}>Player Name</th>
                                            <th style={styles.th}>Role</th>
                                            <th style={styles.th}>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamData.players.map((player, pIdx) => (
                                            <tr key={pIdx} style={styles.tr}>
                                                <td style={styles.td}>{pIdx + 1}</td>
                                                <td style={styles.td}>{player.name}</td>
                                                <td style={styles.td}>{player.role}</td>
                                                <td style={styles.tdPrice}>{formatPrice(player.price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.footer}>
                <button style={styles.backBtn} onClick={() => navigate("/")}>
                    Back to Lobby
                </button>
            </div>
        </div>
    );
}

export default Summary;

const styles = {
    page: {
        background: "#0a0a0a",
        color: "white",
        minHeight: "100vh",
        fontFamily: "Segoe UI, Arial, sans-serif",
        paddingBottom: "30px"
    },
    header: {
        background: "#121212",
        padding: "20px 40px",
        borderBottom: "2px solid #f59e0b",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
    },
    title: {
        margin: 0,
        fontSize: "32px",
        fontWeight: "900",
        color: "#22c55e"
    },
    roomCode: {
        fontSize: "16px",
        color: "#888",
        fontWeight: "bold"
    },
    loading: {
        textAlign: "center",
        padding: "100px",
        fontSize: "24px",
        color: "#888"
    },
    container: {
        maxWidth: "1400px",
        margin: "30px auto",
        padding: "0 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(600px, 1fr))",
        gap: "30px"
    },
    teamCard: {
        background: "#1a1a1a",
        borderRadius: "12px",
        padding: "25px",
        border: "2px solid #333"
    },
    teamHeader: {
        borderBottom: "2px solid #f59e0b",
        paddingBottom: "15px",
        marginBottom: "20px"
    },
    teamName: {
        margin: "0 0 15px 0",
        fontSize: "28px",
        fontWeight: "800",
        color: "#f59e0b"
    },
    teamStats: {
        display: "flex",
        gap: "30px"
    },
    statItem: {
        display: "flex",
        alignItems: "center",
        gap: "8px"
    },
    statLabel: {
        fontSize: "14px",
        color: "#888"
    },
    statValue: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#22c55e"
    },
    playersContainer: {
        maxHeight: "400px",
        overflowY: "auto"
    },
    noPlayers: {
        textAlign: "center",
        padding: "40px",
        color: "#666",
        fontSize: "16px"
    },
    table: {
        width: "100%",
        borderCollapse: "collapse"
    },
    th: {
        textAlign: "left",
        padding: "12px",
        background: "#0f0f0f",
        borderBottom: "2px solid #333",
        fontSize: "14px",
        fontWeight: "bold",
        color: "#888",
        textTransform: "uppercase"
    },
    tr: {
        borderBottom: "1px solid #222"
    },
    td: {
        padding: "15px 12px",
        fontSize: "15px"
    },
    tdPrice: {
        padding: "15px 12px",
        fontSize: "16px",
        fontWeight: "bold",
        color: "#22c55e"
    },
    footer: {
        textAlign: "center",
        marginTop: "40px"
    },
    backBtn: {
        padding: "15px 40px",
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "10px",
        fontSize: "16px",
        fontWeight: "bold",
        cursor: "pointer"
    }
};
