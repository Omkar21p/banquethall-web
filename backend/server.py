from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class Admin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    hall_name: str
    hall_id: Optional[str] = None
    role: str = "admin" # super_admin, admin, booking_staff
    permissions: List[str] = [] # e.g., ["view_bookings", "create_bookings", "view_bills"]
    allowed_services: List[str] = ["*"] # List of service IDs or ["*"] for all
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    hall_name: str
    hall_id: Optional[str] = None
    role: str = "admin"
    permissions: List[str] = []
    allowed_services: List[str] = ["*"]
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = None

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class Hall(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    name_mr: str
    capacity: int
    approx_rent: int
    location: str
    image_url: str
    logo: Optional[str] = None
    description: Optional[str] = None
    description_mr: Optional[str] = None
    gallery_images: list[str] = []

class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hall_id: str
    name: str
    name_mr: str
    price: Optional[int] = None
    description: Optional[str] = None
    description_mr: Optional[str] = None
    image_url: Optional[str] = None

class Package(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hall_id: str
    package_type: str
    name: str
    name_mr: str
    items: List[dict] = []
    rent: Optional[int] = None
    custom_charges: List[dict] = []
    catalogue_url: Optional[str] = None
    catalogue_image: Optional[str] = None
    images: List[str] = []
    description: Optional[str] = None
    description_mr: Optional[str] = None
    custom_fields: Optional[dict] = {}

class ShubhDate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    occasion: str
    occasion_mr: str
    hall_id: str

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hall_id: str
    date: str
    customer_name: str
    customer_city: str
    customer_phone: str
    event_type: str
    num_guests: int
    booking_taken_by: Optional[str] = None
    booking_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "booked"
    event_services: List[dict] = []
    service_bill: Optional[dict] = None

class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: Optional[str] = None
    hall_id: str
    hall_name: str
    customer_name: str
    customer_city: str
    booking_date: str
    event_date: str
    num_guests: int
    event_type: str
    services: List[dict] = []
    thali_items: List[dict] = []
    hall_rent: int
    custom_charges: List[dict] = []
    discount: int = 0
    pre_booking_amount: int = 0
    total_amount: int
    balance_due: int
    deposits: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "settings"
    signup_enabled: bool = False
    language: str = "en"
    theme: str = "light"

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    admin_id = payload.get("sub")
    admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

def require_role(admin: dict, allowed_roles: list):
    """Helper to enforce role-based access. Raises 403 if admin's role is not in allowed_roles."""
    role = admin.get("role", "admin")
    if role not in allowed_roles:
        raise HTTPException(status_code=403, detail=f"Access denied. Required role: {', '.join(allowed_roles)}")

@api_router.post("/auth/login")
async def login(admin_login: AdminLogin):
    admin = await db.admins.find_one({"username": admin_login.username}, {"_id": 0})
    if not admin or not verify_password(admin_login.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login
    now = datetime.now(timezone.utc)
    await db.admins.update_one({"id": admin["id"]}, {"$set": {"last_login": now}})
    
    token = create_access_token({"sub": admin["id"], "username": admin["username"]})
    return {
        "token": token,
        "admin": {
            "id": admin["id"],
            "username": admin["username"],
            "hall_name": admin["hall_name"],
            "hall_id": admin.get("hall_id", ""),
            "role": admin.get("role", "admin"),
            "permissions": admin.get("permissions", []),
            "allowed_services": admin.get("allowed_services", ["*"])
        }
    }

@api_router.post("/auth/change-password")
async def change_password(change_pwd: ChangePassword, admin=Depends(get_current_admin)):
    if not verify_password(change_pwd.old_password, admin["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid old password")
    
    new_hash = hash_password(change_pwd.new_password)
    await db.admins.update_one({"id": admin["id"]}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password changed successfully"}

@api_router.get("/admins", response_model=List[AdminResponse])
async def get_admins(admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin"])
    admins = await db.admins.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    return admins

@api_router.post("/admins")
async def create_admin(admin_data: dict, admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin"])
    existing = await db.admins.find_one({"username": admin_data["username"]})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Resolve hall_name from hall_id if provided
    hall_name = admin_data.get("hall_name", "")
    hall_id = admin_data.get("hall_id", "")
    if hall_id and not hall_name:
        hall = await db.halls.find_one({"id": hall_id}, {"_id": 0})
        if hall:
            hall_name = hall["name"]
    
    new_admin = Admin(
        username=admin_data["username"],
        password_hash=hash_password(admin_data["password"]),
        hall_name=hall_name,
        hall_id=hall_id,
        role=admin_data.get("role", "admin"),
        permissions=admin_data.get("permissions", []),
        allowed_services=admin_data.get("allowed_services", ["*"])
    )
    await db.admins.insert_one(new_admin.model_dump())
    return {"message": "Admin created successfully", "id": new_admin.id}

@api_router.put("/admins/{admin_id}")
async def update_admin_role(admin_id: str, data: dict, admin=Depends(get_current_admin)):
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can manage permissions")
    
    await db.admins.update_one(
        {"id": admin_id},
        {"$set": {
            "role": data.get("role"),
            "permissions": data.get("permissions", []),
            "allowed_services": data.get("allowed_services", ["*"]),
            "hall_id": data.get("hall_id"),
            "hall_name": data.get("hall_name")
        }}
    )
    return {"message": "Admin updated successfully"}

@api_router.put("/admins/{admin_id}/reset-password")
async def reset_admin_password(admin_id: str, data: dict, admin=Depends(get_current_admin)):
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can reset passwords")
    
    new_hash = hash_password(data["new_password"])
    await db.admins.update_one({"id": admin_id}, {"$set": {"password_hash": new_hash}})
    return {"message": "Password reset successfully"}

@api_router.delete("/admins/{admin_id}")
async def delete_admin(admin_id: str, admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin"])
    if admin_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    await db.admins.delete_one({"id": admin_id})
    return {"message": "Admin deleted successfully"}

@api_router.post("/halls")
async def create_hall(hall: Hall, admin=Depends(get_current_admin)):
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create halls")
    await db.halls.insert_one(hall.model_dump())
    return {"message": "Hall created successfully", "id": hall.id}

@api_router.delete("/halls/{hall_id}")
async def delete_hall(hall_id: str, admin=Depends(get_current_admin)):
    if admin.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can delete halls")
    await db.halls.delete_one({"id": hall_id})
    return {"message": "Hall deleted successfully"}
@api_router.get("/halls", response_model=List[Hall])
async def get_halls():
    halls = await db.halls.find({}, {"_id": 0}).to_list(100)
    return halls

@api_router.get("/halls/{hall_id}", response_model=Hall)
async def get_hall(hall_id: str):
    hall = await db.halls.find_one({"id": hall_id}, {"_id": 0})
    if not hall:
        raise HTTPException(status_code=404, detail="Hall not found")
    return hall

@api_router.put("/halls/{hall_id}")
async def update_hall(hall_id: str, hall: Hall, admin=Depends(get_current_admin)):
    await db.halls.update_one({"id": hall_id}, {"$set": hall.model_dump()})
    # Also update hall_name on all admins linked to this hall
    await db.admins.update_many(
        {"hall_id": hall_id},
        {"$set": {"hall_name": hall.name}}
    )
    return {"message": "Hall updated successfully"}

@api_router.get("/services", response_model=List[Service])
async def get_services(hall_id: Optional[str] = None):
    query = {"hall_id": hall_id} if hall_id else {}
    services = await db.services.find(query, {"_id": 0}).to_list(1000)
    return services

@api_router.post("/services", response_model=Service)
async def create_service(service: Service, admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin", "admin"])
    await db.services.insert_one(service.model_dump())
    return service

@api_router.put("/services/{service_id}")
async def update_service(service_id: str, service: Service, admin=Depends(get_current_admin)):
    await db.services.update_one({"id": service_id}, {"$set": service.model_dump()})
    return {"message": "Service updated successfully"}

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin", "admin"])
    await db.services.delete_one({"id": service_id})
    return {"message": "Service deleted successfully"}

@api_router.get("/packages", response_model=List[Package])
async def get_packages(hall_id: Optional[str] = None):
    query = {"hall_id": hall_id} if hall_id else {}
    packages = await db.packages.find(query, {"_id": 0}).to_list(1000)
    return packages

@api_router.post("/packages", response_model=Package)
async def create_package(package: Package, admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin", "admin"])
    await db.packages.insert_one(package.model_dump())
    return package

@api_router.put("/packages/{package_id}")
async def update_package(package_id: str, package: Package, admin=Depends(get_current_admin)):
    await db.packages.update_one({"id": package_id}, {"$set": package.model_dump()})
    return {"message": "Package updated successfully"}

@api_router.delete("/packages/{package_id}")
async def delete_package(package_id: str, admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin", "admin"])
    await db.packages.delete_one({"id": package_id})
    return {"message": "Package deleted successfully"}

@api_router.get("/shubh-dates", response_model=List[ShubhDate])
async def get_shubh_dates(hall_id: Optional[str] = None):
    query = {"hall_id": hall_id} if hall_id else {}
    dates = await db.shubh_dates.find(query, {"_id": 0}).to_list(1000)
    return dates

@api_router.post("/shubh-dates", response_model=ShubhDate)
async def create_shubh_date(shubh_date: ShubhDate, admin=Depends(get_current_admin)):
    await db.shubh_dates.insert_one(shubh_date.model_dump())
    return shubh_date

@api_router.delete("/shubh-dates/{date_id}")
async def delete_shubh_date(date_id: str, admin=Depends(get_current_admin)):
    await db.shubh_dates.delete_one({"id": date_id})
    return {"message": "Shubh date deleted successfully"}

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(hall_id: Optional[str] = None, admin=Depends(get_current_admin)):
    query = {"hall_id": hall_id} if hall_id else {}
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(1000)
    for booking in bookings:
        if isinstance(booking['booking_date'], str):
            booking['booking_date'] = datetime.fromisoformat(booking['booking_date'])
    return bookings

@api_router.get("/public/bookings")
async def get_public_bookings(hall_id: Optional[str] = None):
    query = {"hall_id": hall_id, "status": "booked"} if hall_id else {"status": "booked"}
    bookings = await db.bookings.find(query, {"_id": 0, "customer_phone": 0}).to_list(1000)
    return bookings

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking: Booking, admin=Depends(get_current_admin)):
    doc = booking.model_dump()
    doc['booking_date'] = doc['booking_date'].isoformat()
    await db.bookings.insert_one(doc)
    return booking

@api_router.put("/bookings/{booking_id}")
async def update_booking(booking_id: str, booking: Booking, admin=Depends(get_current_admin)):
    doc = booking.model_dump()
    doc['booking_date'] = doc['booking_date'].isoformat()
    await db.bookings.update_one({"id": booking_id}, {"$set": doc})
    return {"message": "Booking updated successfully"}

@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, admin=Depends(get_current_admin)):
    await db.bookings.delete_one({"id": booking_id})
    return {"message": "Booking deleted successfully"}

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(hall_id: Optional[str] = None, admin=Depends(get_current_admin)):
    query = {"hall_id": hall_id} if hall_id else {}
    bills = await db.bills.find(query, {"_id": 0}).to_list(1000)
    for bill in bills:
        if isinstance(bill['created_at'], str):
            bill['created_at'] = datetime.fromisoformat(bill['created_at'])
    return bills

@api_router.post("/bills", response_model=Bill)
async def create_bill(bill: Bill, admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin", "admin"])
    doc = bill.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.bills.insert_one(doc)
    return bill

@api_router.put("/bills/{bill_id}")
async def update_bill(bill_id: str, bill: Bill, admin=Depends(get_current_admin)):
    doc = bill.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.bills.update_one({"id": bill_id}, {"$set": doc})
    return {"message": "Bill updated successfully"}

@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin", "admin"])
    await db.bills.delete_one({"id": bill_id})
    return {"message": "Bill deleted successfully"}

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        default_settings = Settings()
        await db.settings.insert_one(default_settings.model_dump())
        return default_settings
    return settings

@api_router.put("/settings")
async def update_settings(settings: Settings, admin=Depends(get_current_admin)):
    await db.settings.update_one({"id": "settings"}, {"$set": settings.model_dump()}, upsert=True)
    return {"message": "Settings updated successfully"}

@api_router.post("/reset-system")
async def reset_system(admin=Depends(get_current_admin)):
    require_role(admin, ["super_admin"])
    # Delete all bookings and bills
    await db.bookings.delete_many({})
    await db.bills.delete_many({})
    return {"message": "System reset successfully"}

@api_router.post("/data/export")
async def export_data(data: dict, admin=Depends(get_current_admin)):
    """Export bookings and bills for a date range. Super admin only."""
    require_role(admin, ["super_admin"])
    from_date = data.get("from_date", "")
    to_date = data.get("to_date", "")
    
    # Build query for bookings (uses 'date' field as string YYYY-MM-DD)
    booking_query = {}
    bill_query = {}
    if from_date and to_date:
        booking_query["date"] = {"$gte": from_date, "$lte": to_date}
        bill_query["event_date"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        booking_query["date"] = {"$gte": from_date}
        bill_query["event_date"] = {"$gte": from_date}
    elif to_date:
        booking_query["date"] = {"$lte": to_date}
        bill_query["event_date"] = {"$lte": to_date}
    
    bookings = await db.bookings.find(booking_query, {"_id": 0}).to_list(10000)
    bills = await db.bills.find(bill_query, {"_id": 0}).to_list(10000)
    
    # Convert datetime objects to string for JSON serialization
    for b in bookings:
        if isinstance(b.get('booking_date'), datetime):
            b['booking_date'] = b['booking_date'].isoformat()
    for b in bills:
        if isinstance(b.get('created_at'), datetime):
            b['created_at'] = b['created_at'].isoformat()
    
    return {
        "bookings": bookings,
        "bills": bills,
        "count": {"bookings": len(bookings), "bills": len(bills)},
        "range": {"from": from_date, "to": to_date}
    }

@api_router.post("/data/purge")
async def purge_data(data: dict, admin=Depends(get_current_admin)):
    """Permanently delete bookings and bills for a date range. Super admin only."""
    require_role(admin, ["super_admin"])
    from_date = data.get("from_date", "")
    to_date = data.get("to_date", "")
    
    if not from_date or not to_date:
        raise HTTPException(status_code=400, detail="Both from_date and to_date are required")
    
    booking_query = {"date": {"$gte": from_date, "$lte": to_date}}
    bill_query = {"event_date": {"$gte": from_date, "$lte": to_date}}
    
    booking_result = await db.bookings.delete_many(booking_query)
    bill_result = await db.bills.delete_many(bill_query)
    
    return {
        "message": "Data purged successfully",
        "deleted": {
            "bookings": booking_result.deleted_count,
            "bills": bill_result.deleted_count
        },
        "range": {"from": from_date, "to": to_date}
    }

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), admin=Depends(get_current_admin)):
    try:
        contents = await file.read()
        base64_image = base64.b64encode(contents).decode('utf-8')
        file_extension = file.filename.split('.')[-1]
        image_data = f"data:image/{file_extension};base64,{base64_image}"
        return {"image_data": image_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading image: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Ensure halls exist first so we can get their IDs
    halls_count = await db.halls.count_documents({})
    if halls_count == 0:
        halls_data = [
            Hall(
                name="Om Lawns Banquet Hall",
                name_mr="ॐ लॉन्स बॅन्क्वेट हॉल",
                capacity=500,
                approx_rent=50000,
                location="https://maps.google.com",
                image_url="https://images.pexels.com/photos/33914530/pexels-photo-33914530.jpeg",
                description="Elegant banquet hall for weddings and events",
                description_mr="विवाह आणि कार्यक्रमांसाठी सुंदर बॅन्क्वेट हॉल"
            ),
            Hall(
                name="Shiv Lawns Banquet Hall",
                name_mr="शिव लॉन्स बॅन्क्वेट हॉल",
                capacity=800,
                approx_rent=75000,
                location="https://maps.google.com",
                image_url="https://images.pexels.com/photos/4717558/pexels-photo-4717558.jpeg",
                description="Grand banquet hall with lawn facility",
                description_mr="लॉन सुविधेसह भव्य बॅन्क्वेट हॉल"
            )
        ]
        for hall in halls_data:
            await db.halls.insert_one(hall.model_dump())
        logger.info("Created default halls")

    # Get hall IDs for admin creation
    om_hall = await db.halls.find_one({"name": {"$regex": "Om", "$options": "i"}}, {"_id": 0})
    shiv_hall = await db.halls.find_one({"name": {"$regex": "Shiv", "$options": "i"}}, {"_id": 0})

    admin1_exists = await db.admins.find_one({"username": "om_admin"})
    admin2_exists = await db.admins.find_one({"username": "shiv_admin"})
    
    if not admin1_exists:
        admin1 = Admin(
            username="om_admin",
            password_hash=hash_password("om123"),
            hall_name=om_hall["name"] if om_hall else "Om Lawns Banquet Hall",
            hall_id=om_hall["id"] if om_hall else "",
            role="super_admin",
            permissions=["*"]
        )
        await db.admins.insert_one(admin1.model_dump())
        logger.info("Created default super admin: om_admin / om123")
    else:
        # Migration: ensure om_admin always has super_admin role
        if admin1_exists.get("role") != "super_admin":
            await db.admins.update_one(
                {"username": "om_admin"},
                {"$set": {"role": "super_admin", "permissions": ["*"], "allowed_services": ["*"]}}
            )
            logger.info("Migrated om_admin to super_admin role")
    
    if not admin2_exists:
        admin2 = Admin(
            username="shiv_admin",
            password_hash=hash_password("shiv123"),
            hall_name=shiv_hall["name"] if shiv_hall else "Shiv Lawns Banquet Hall",
            hall_id=shiv_hall["id"] if shiv_hall else ""
        )
        await db.admins.insert_one(admin2.model_dump())
        logger.info("Created default admin: shiv_admin / shiv123")

    # Create super_admin account
    super_admin_exists = await db.admins.find_one({"username": "super_admin"})
    if not super_admin_exists:
        super_adm = Admin(
            username="super_admin",
            password_hash=hash_password("om@100"),
            hall_name=om_hall["name"] if om_hall else "Om Lawns Banquet Hall",
            hall_id=om_hall["id"] if om_hall else "",
            role="super_admin",
            permissions=["*"],
            allowed_services=["*"]
        )
        await db.admins.insert_one(super_adm.model_dump())
        logger.info("Created super admin: super_admin")

    # Migration: backfill hall_id for existing admins that don't have it
    all_halls = await db.halls.find({}, {"_id": 0}).to_list(100)
    admins_without_hall_id = await db.admins.find(
        {"$or": [{"hall_id": {"$exists": False}}, {"hall_id": None}, {"hall_id": ""}]},
        {"_id": 0}
    ).to_list(100)
    for adm in admins_without_hall_id:
        adm_hall_name = adm.get("hall_name", "").lower()
        for h in all_halls:
            h_name = h["name"].lower()
            if h_name == adm_hall_name or h_name in adm_hall_name or adm_hall_name in h_name:
                await db.admins.update_one(
                    {"id": adm["id"]},
                    {"$set": {"hall_id": h["id"], "hall_name": h["name"]}}
                )
                logger.info(f"Migrated admin {adm['username']} -> hall_id {h['id']}")
                break

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)# Force Re-deployment - v1.0.1
