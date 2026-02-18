import cloudinary
import cloudinary.uploader
import pytesseract
from pdf2image import convert_from_bytes
import io
from PIL import Image
import re
from ..config import settings
import requests


cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET_KEY
)

class KYCService:
    @staticmethod
    def upload_document(file_bytes, user_id):
        """Uploads file specifically as a PDF to Cloudinary"""
        result = cloudinary.uploader.upload(
            file_bytes, 
            folder=f"kyc/{user_id}",
            resource_type="auto", # Allows Cloudinary to detect it's a PDF
            format="pdf"          # Forces PDF format
        )
        return result.get("secure_url")

    @staticmethod
    def extract_number_from_pdf(pdf_url, doc_type):
        """Downloads PDF, converts to image, and runs OCR"""
        # 1. Download PDF
        response = requests.get(pdf_url)
        if response.status_code != 200:
            return "Error: Could not download PDF"

        # 2. Convert PDF to Image (using first page)
        images = convert_from_bytes(response.content)
        if not images:
            return "Error: Could not process PDF pages"
        
        first_page = images[0]

        # 3. OCR Extraction
        text = pytesseract.image_to_string(first_page)

        # 4. Identification Regex
        if doc_type == "aadhar":
            # 12 digits (with optional spaces)
            match = re.search(r'\d{4}\s?\d{4}\s?\d{4}', text)
        else: # pan
            # 5 letters, 4 digits, 1 letter
            match = re.search(r'[A-Z]{5}[0-9]{4}[A-Z]{1}', text.upper())

        return match.group(0) if match else "No number found"