from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import OrderStatus, ProductStatus, UserRole


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole = UserRole.BUYER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool

class SellerCreate(BaseModel):
    shop_name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    inn: str | None = None

class SellerUpdate(BaseModel):
    shop_name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    inn: str | None = None

class SellerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    shop_name: str
    description: str | None
    inn: str | None
    is_verified: bool
    rejection_reason: str | None
    rating: Decimal
    created_at: datetime

class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    name: str
    parent_id: int | None

class ProductCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    brand: str | None = None
    category_id: int
    price: Decimal = Field(gt=0)
    old_price: Decimal | None = None
    stock: int = Field(ge=0, default=0)
    image_url: str | None = None

class ProductUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    brand: str | None = None
    category_id: int | None = None
    price: Decimal | None = None
    old_price: Decimal | None = None
    stock: int | None = None
    image_url: str | None = None

class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    seller_id: int
    category_id: int
    title: str
    description: str | None
    brand: str | None
    price: Decimal
    old_price: Decimal | None
    stock: int
    status: ProductStatus
    rejection_reason: str | None
    image_url: str | None
    rating: Decimal
    reviews_count: int

class ProductListResponse(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int

class CartItemAdd(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, default=1)

class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    quantity: int
    product: ProductOut


class CartSummary(BaseModel):
    """Cart summary with pricing breakdown."""
    subtotal: Decimal = Field(..., decimal_places=2)
    available_bonuses: Decimal = Field(default=Decimal("0"), decimal_places=2)
    max_bonus_discount: Decimal = Field(default=Decimal("0"), decimal_places=2)
    promo_discount: Decimal = Field(default=Decimal("0"), decimal_places=2)
    bonus_discount: Decimal = Field(default=Decimal("0"), decimal_places=2)
    total: Decimal = Field(..., decimal_places=2)


class CartOut(BaseModel):
    """Full cart response with items and summary."""
    items: list[CartItemOut]
    subtotal: Decimal = Field(..., decimal_places=2)
    available_bonuses: Decimal = Field(default=Decimal("0"), decimal_places=2)
    total: Decimal = Field(..., decimal_places=2)

class OrderCreate(BaseModel):
    address: str = Field(min_length=1, max_length=500)
    promo_code: str | None = None
    bonus_to_spend: Decimal = Field(default=Decimal("0"), ge=0)

class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    title: str
    price: Decimal
    quantity: int
    image_url: str | None = None

class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    buyer_id: int
    seller_id: int
    status: OrderStatus
    subtotal: Decimal = Decimal("0")
    promo_discount: Decimal = Decimal("0")
    bonus_spent: Decimal = Decimal("0")
    promo_code: str | None = None
    total: Decimal
    address: str
    pickup_code: str | None
    created_at: datetime
    items: list[OrderItemOut]


class OrderPartyOut(BaseModel):
    id: int
    full_name: str
    email: str


class OrderSellerSummaryOut(BaseModel):
    id: int
    user_id: int
    shop_name: str
    is_verified: bool


class AdminOrderDetailOut(OrderOut):
    buyer: OrderPartyOut
    seller: OrderSellerSummaryOut

class PaymentCreate(BaseModel):
    order_id: int
    method: str = "card"
    idempotency_key: str = Field(min_length=8, max_length=128)

class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_id: int
    amount: Decimal
    status: str
    method: str

class ReviewCreate(BaseModel):
    product_id: int
    rating: int = Field(ge=1, le=5)
    text: str | None = None

class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    product_id: int
    rating: int
    text: str | None
    created_at: datetime

class FavoriteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    product: ProductOut

class FavoriteToggleResult(BaseModel):
    product_id: int
    favorited: bool

class AddressCreate(BaseModel):
    title: str = Field(min_length=1, max_length=128)
    full_address: str = Field(min_length=1, max_length=500)
    is_default: bool = False

class AddressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    full_address: str
    is_default: bool

class CardCreate(BaseModel):
    holder: str = Field(min_length=1, max_length=128)
    number: str = Field(min_length=13, max_length=19)
    expiry: str = Field(pattern=r"^\d{2}/\d{2}$")
    cvv: str = Field(min_length=3, max_length=4)
    is_default: bool = False

class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    holder: str
    last4: str
    brand: str
    expiry: str
    is_default: bool

class SupportTicketCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    message: str = Field(min_length=1)

class SupportMessageCreate(BaseModel):
    body: str = Field(min_length=1)

class SupportMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    author_id: int
    body: str
    created_at: datetime

class SupportTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    subject: str
    message: str
    status: str
    created_at: datetime
    messages: list[SupportMessageOut] = []

class OrderPickupConfirm(BaseModel):
    code: str

class ModerationAction(BaseModel):
    approve: bool
    reason: str | None = None

class AdminStats(BaseModel):
    users_total: int
    sellers_total: int
    verified_sellers_total: int
    products_total: int
    products_pending: int
    orders_total: int
    delivered_orders_total: int
    gmv: Decimal
    marketplace_revenue: Decimal
    net_profit: Decimal
    avg_delivery_hours: float | None


class AnalyticsTopItem(BaseModel):
    label: str
    value: Decimal


class SellerAnalyticsOut(BaseModel):
    seller_id: int
    shop_name: str
    orders_total: int
    delivered_orders_total: int
    turnover: Decimal
    revenue: Decimal
    platform_fee: Decimal
    average_order_value: Decimal
    avg_delivery_hours: float | None
    top_products: list[AnalyticsTopItem]
    top_categories: list[AnalyticsTopItem]


class UserAnalyticsOut(BaseModel):
    user_id: int
    full_name: str
    orders_total: int
    delivered_orders_total: int
    spent_total: Decimal
    average_order_value: Decimal
    favorite_categories: list[AnalyticsTopItem]
    favorite_shops: list[AnalyticsTopItem]

class PushSubCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

class NotificationStatus(BaseModel):
    telegram_linked: bool
    push_enabled: bool


class TelegramLinkOut(BaseModel):
    url: str
    webhook_hint: str | None = None
