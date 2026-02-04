import React from 'react';

const DiscordWidget = ({ serverId, width = "350", height = "500" }) => {
    // Default to a placeholder ID if none provided. 
    // User needs to replace this with their actual Server ID or pass it as prop.
    const finalServerId = serverId || "1336024976451698710"; // Placeholder ID, change dynamically if needed

    return (
        <div className="discord-widget-container bg-[#0f172a] border border-indigo-500/50 rounded-xl overflow-hidden shadow-2xl">
            <iframe
                src={`https://discord.com/widget?id=${finalServerId}&theme=dark`}
                width={width}
                height={height}
                allowtransparency="true"
                frameBorder="0"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                title="Discord Widget"
            ></iframe>
        </div>
    );
};

export default DiscordWidget;
