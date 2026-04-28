from fastapi import FastAPI, UploadFile, File, HTTPException
import joblib
import numpy as np
import os
import tempfile
from keras.utils import load_img, img_to_array
import warnings
from PIL import Image
import io
import time
warnings.filterwarnings("ignore")

app = FastAPI()

# Print startup info
print("=" * 60)
print("🌱 PLANT DISEASE SERVICE STARTING")
print("=" * 60)

# Load models
try:
    model = joblib.load("./artifacts/model.pkl")
    class_names = joblib.load("./artifacts/class_names.pkl")
    print(f"✅ Model loaded successfully")
    print(f"✅ Model type: {type(model)}")
    print(f"✅ Class names: {class_names}")
    print(f"✅ Number of classes: {len(class_names)}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    raise

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    start_time = time.time()
    tmp_path = None
    
    print("\n" + "=" * 60)
    print(f"📥 NEW PREDICTION REQUEST RECEIVED")
    print("=" * 60)
    
    try:
        # Log 1: Request metadata
        print(f"📄 Filename: {file.filename}")
        print(f"📄 Content-Type: {file.content_type}")
        print(f"📄 File size: {file.size if file.size else 'Unknown'}")
        
        # Log 2: Read file contents
        print(f"📖 Reading file contents...")
        contents = await file.read()
        print(f"✅ File read successfully. Size: {len(contents)} bytes")
        
        # Log 3: Check file signature
        print(f"🔍 Checking file signature...")
        signatures = {
            b'\xff\xd8': 'JPEG',
            b'\x89PNG': 'PNG',
            b'RIFF': 'WEBP',
            b'GIF8': 'GIF',
            b'BM': 'BMP'
        }
        
        detected_format = None
        for sig, format_name in signatures.items():
            if contents[:len(sig)] == sig:
                detected_format = format_name
                break
        
        if detected_format:
            print(f"✅ Detected format: {detected_format}")
        else:
            print(f"⚠️ Unknown format! First 20 bytes: {contents[:20]}")
        
        # Log 4: Try to open with PIL
        print(f"🖼️ Opening image with PIL...")
        try:
            img = Image.open(io.BytesIO(contents))
            print(f"✅ PIL opened image successfully")
            print(f"   - Format: {img.format}")
            print(f"   - Mode: {img.mode}")
            print(f"   - Size: {img.size}")
            print(f"   - Info: {img.info}")
        except Exception as e:
            print(f"❌ PIL failed to open image: {e}")
            raise
        
        # Log 5: Convert to RGB
        print(f"🔄 Converting to RGB...")
        if img.mode != 'RGB':
            img = img.convert('RGB')
            print(f"✅ Converted from {img.mode} to RGB")
        else:
            print(f"✅ Already in RGB mode")
        
        # Log 6: Resize
        print(f"📏 Resizing image...")
        original_size = img.size
        img = img.resize((128, 128))
        print(f"✅ Resized from {original_size} to {img.size}")
        
        # Log 7: Convert to array
        print(f"🔢 Converting to numpy array...")
        arr_img = img_to_array(img)
        print(f"✅ Array created")
        print(f"   - Shape: {arr_img.shape}")
        print(f"   - Dtype: {arr_img.dtype}")
        print(f"   - Min value: {arr_img.min()}")
        print(f"   - Max value: {arr_img.max()}")
        print(f"   - Mean value: {arr_img.mean():.2f}")
        
        # Log 8: Expand dimensions
        print(f"📊 Adding batch dimension...")
        arr_img = np.expand_dims(arr_img, axis=0)
        print(f"✅ New shape: {arr_img.shape}")
        
        # Log 9: Normalization check
        print(f"🎯 Checking normalization...")
        if arr_img.max() > 1.0:
            print(f"⚠️ Values > 1.0 detected (max: {arr_img.max()}). Consider normalizing to 0-1 range.")
        else:
            print(f"✅ Values already in 0-1 range (max: {arr_img.max()})")
        
        # Log 10: Model prediction
        print(f"🤖 Running model prediction...")
        predict_start = time.time()
        predictions = model.predict(arr_img)
        predict_time = time.time() - predict_start
        print(f"✅ Prediction completed in {predict_time:.3f}s")
        print(f"   - Predictions shape: {predictions.shape}")
        print(f"   - Predictions dtype: {predictions.dtype}")
        print(f"   - Predictions sum: {np.sum(predictions):.4f}")
        
        # Log 11: Get results
        print(f"📊 Processing results...")
        disease_class = np.argmax(predictions)
        confidence = np.max(predictions)
        
        print(f"✅ Results:")
        print(f"   - Disease class index: {disease_class}")
        print(f"   - Confidence: {confidence:.4f}")
        print(f"   - Disease name: {class_names[disease_class]}")
        
        # Log 12: Top 3 predictions
        top_3_idx = np.argsort(predictions[0])[-3:][::-1]
        print(f"📈 Top 3 predictions:")
        for idx in top_3_idx:
            print(f"   - {class_names[idx]}: {predictions[0][idx]:.4f}")
        
        # Log 13: Total processing time
        total_time = time.time() - start_time
        print(f"⏱️ Total processing time: {total_time:.3f}s")
        print("=" * 60)
        
        return {
            "disease": str(class_names[disease_class]),
            "confidence": float(confidence),
            "debug": {
                "file_size": len(contents),
                "detected_format": detected_format,
                "processing_time": total_time,
                "prediction_time": predict_time
            }
        }
        
    except Exception as e:
        print(f"\n❌ ERROR IN PREDICTION:")
        print(f"   Error type: {type(e).__name__}")
        print(f"   Error message: {str(e)}")
        
        import traceback
        print(f"\n📋 Full traceback:")
        traceback.print_exc()
        
        print("=" * 60)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    
    finally:
        # Clean up temporary file if used
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
            print(f"🧹 Cleaned up temporary file: {tmp_path}")

# Additional debug endpoint to test connectivity
@app.post("/debug/test")
async def debug_test():
    """Simple test endpoint to check if service is reachable"""
    return {
        "status": "ok",
        "message": "Plant disease service is reachable",
        "model_loaded": model is not None,
        "num_classes": len(class_names) if class_names else 0
    }

# Endpoint to check what the service receives
@app.post("/debug/receive")
async def debug_receive(file: UploadFile = File(...)):
    """Debug endpoint to see raw received data"""
    contents = await file.read()
    
    # Check file signature
    signatures = {
        b'\xff\xd8': 'JPEG',
        b'\x89PNG': 'PNG',
        b'RIFF': 'WEBP',
    }
    
    detected = None
    for sig, name in signatures.items():
        if contents[:len(sig)] == sig:
            detected = name
            break
    
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(contents),
        "detected_format": detected,
        "first_20_bytes": list(contents[:20]),
        "last_20_bytes": list(contents[-20:]) if len(contents) > 20 else None
    }