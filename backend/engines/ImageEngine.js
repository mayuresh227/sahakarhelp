const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

class ImageEngine {
  async execute(tool, inputs) {
    switch(tool.slug) {
      case 'image-compressor':
        return this.compressImage(inputs);
      case 'image-resizer':
        return this.resizeImage(inputs);
      case 'image-cropper':
        return this.cropImage(inputs);
      default:
        throw new Error(`Unsupported tool for image engine: ${tool.slug}`);
    }
  }

  async compressImage({ image, quality }) {
    try {
      const tempPath = path.join('/tmp', `${Date.now()}-compressed.jpg`);
      await sharp(image.buffer)
        .jpeg({ quality: parseInt(quality) })
        .toFile(tempPath);
      
      const compressedBuffer = fs.readFileSync(tempPath);
      await unlinkAsync(tempPath);
      
      return {
        success: true,
        compressedImage: compressedBuffer.toString('base64'),
        format: 'jpg'
      };
    } catch (error) {
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  async resizeImage({ image, width, height }) {
    try {
      const tempPath = path.join('/tmp', `${Date.now()}-resized.jpg`);
      await sharp(image.buffer)
        .resize(parseInt(width), parseInt(height))
        .toFile(tempPath);
      
      const resizedBuffer = fs.readFileSync(tempPath);
      await unlinkAsync(tempPath);
      
      return {
        success: true,
        resizedImage: resizedBuffer.toString('base64'),
        format: 'jpg'
      };
    } catch (error) {
      throw new Error(`Image resizing failed: ${error.message}`);
    }
  }

  async cropImage({ image, cropType, width, height, x, y }) {
    try {
      const tempPath = path.join('/tmp', `${Date.now()}-cropped.jpg`);
      const sharpInstance = sharp(image.buffer);
      
      // Get image metadata to determine dimensions
      const metadata = await sharpInstance.metadata();
      
      let croppedImage;
      
      switch(cropType) {
        case 'square':
          // Crop to square (1:1 ratio) from center
          const size = Math.min(metadata.width, metadata.height);
          const left = Math.floor((metadata.width - size) / 2);
          const top = Math.floor((metadata.height - size) / 2);
          croppedImage = await sharpInstance
            .extract({ left, top, width: size, height: size })
            .toFile(tempPath);
          break;
          
        case 'circle':
          // First crop to square, then create circle mask
          const circleSize = Math.min(metadata.width, metadata.height);
          const circleLeft = Math.floor((metadata.width - circleSize) / 2);
          const circleTop = Math.floor((metadata.height - circleSize) / 2);
          
          // Create a circular mask
          const circleMask = Buffer.from(
            `<svg><circle cx="${circleSize/2}" cy="${circleSize/2}" r="${circleSize/2}" /></svg>`
          );
          
          croppedImage = await sharpInstance
            .extract({ left: circleLeft, top: circleTop, width: circleSize, height: circleSize })
            .composite([{
              input: circleMask,
              blend: 'dest-in'
            }])
            .toFile(tempPath);
          break;
          
        case 'custom':
        default:
          // Custom crop with provided dimensions
          if (!width || !height) {
            throw new Error('Width and height are required for custom crop');
          }
          
          const cropX = x ? parseInt(x) : 0;
          const cropY = y ? parseInt(y) : 0;
          const cropWidth = parseInt(width);
          const cropHeight = parseInt(height);
          
          // Validate crop dimensions
          if (cropX + cropWidth > metadata.width || cropY + cropHeight > metadata.height) {
            throw new Error('Crop area exceeds image dimensions');
          }
          
          croppedImage = await sharpInstance
            .extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
            .toFile(tempPath);
          break;
      }
      
      const croppedBuffer = fs.readFileSync(tempPath);
      await unlinkAsync(tempPath);
      
      return {
        success: true,
        croppedImage: croppedBuffer.toString('base64'),
        format: 'jpg'
      };
    } catch (error) {
      throw new Error(`Image cropping failed: ${error.message}`);
    }
  }
}

module.exports = ImageEngine;