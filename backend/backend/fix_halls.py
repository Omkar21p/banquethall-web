import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv('/Users/omkar/Documents/banquet-hall-app/backend/.env')

async def fix():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    admins = await db.admins.find({}, {"_id": 0}).to_list(100)
    print("Admins:")
    for a in admins:
        print(f" - {a['username']}: hall_id={a.get('hall_id')}, hall_name={a.get('hall_name')}")
        
    halls = await db.halls.find({}, {"_id": 0}).to_list(100)
    print("\nHalls:")
    for h in halls:
        print(f" - {h['name']}: id={h.get('id')}")
        
    services = await db.services.find({}, {"_id": 0}).to_list(100)
    print("\nServices mapping:")
    from collections import Counter
    counts = Counter(s.get('hall_id') for s in services)
    for hall_id, count in counts.items():
        print(f" - hall_id={hall_id}: {count} services")

asyncio.run(fix())
