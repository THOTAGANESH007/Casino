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
    region_id = Column(Integer, ForeignKey("tenant_regions.region_id"))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationships
    region = relationship("TenantRegion", back_populates="tenants")
    users = relationship("User", back_populates="tenant")

    @property
    def region_name(self):
        return self.region.region_name if self.region else None


class TenantRegion(Base):
    __tablename__ = "tenant_regions"
    
    region_id = Column(Integer, primary_key=True, index=True)
    region_name = Column(String)
    tax_rate = Column(Numeric(5, 2))
    
    # Relationships
    tenants = relationship("Tenant", back_populates="region")
    users = relationship("User", back_populates="region")