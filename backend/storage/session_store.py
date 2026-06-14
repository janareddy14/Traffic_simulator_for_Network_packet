import json
import logging
from pathlib import Path
import aiosqlite

logger = logging.getLogger(__name__)

DB_PATH = Path("data/traffic.db")

async def init_db():
    """Initializes the SQLite database and creates tables if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS packets (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                protocol TEXT NOT NULL,
                source_ip TEXT NOT NULL,
                destination_ip TEXT NOT NULL,
                status TEXT NOT NULL,
                data_json TEXT NOT NULL
            )
        """)
        
        # Create an index on timestamp for faster retrieval during replays
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_packets_timestamp ON packets(timestamp)
        """)
        
        await db.commit()
    logger.info(f"Initialized SQLite database at {DB_PATH}")


async def insert_packet(packet_dict: dict):
    """Inserts a single packet into the database."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                """
                INSERT OR IGNORE INTO packets (
                    id, timestamp, protocol, source_ip, destination_ip, status, data_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    packet_dict["id"],
                    packet_dict["timestamp"],
                    packet_dict["protocol"],
                    packet_dict["source_ip"],
                    packet_dict["destination_ip"],
                    packet_dict["status"],
                    json.dumps(packet_dict)
                )
            )
            await db.commit()
    except Exception as e:
        logger.error(f"Failed to insert packet into DB: {e}")


async def get_recent_packets(limit: int = 1000):
    """Fetches the most recent packets from the database, ordered chronologically."""
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            # We want the most recent N packets, but we want them returned in chronological order
            # (oldest to newest within that window)
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT data_json FROM (
                    SELECT * FROM packets 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                ) ORDER BY timestamp ASC
                """,
                (limit,)
            )
            rows = await cursor.fetchall()
            return [json.loads(row["data_json"]) for row in rows]
    except Exception as e:
        logger.error(f"Failed to retrieve packets from DB: {e}")
        return []
