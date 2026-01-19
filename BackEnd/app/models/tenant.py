from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base

class Tenant(Base):
    __tablename__ = "tenants"
    
    tenant_id = Column(Integer, primary_key=True, index=True)
    tenant_name = Column(String, nullable=False)
    default_timezone = Column(String)
    status = Column(Boolean, default=True)
    default_currency = Column(String)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationships
    regions = relationship("TenantRegion", back_populates="tenant")
    users = relationship("User", back_populates="tenant")


class TenantRegion(Base):
    __tablename__ = "tenant_regions"
    
    region_id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.tenant_id"))
    region_name = Column(String)
    tax_rate = Column(Numeric(5, 2))
    
    # Relationships
    tenant = relationship("Tenant", back_populates="regions")