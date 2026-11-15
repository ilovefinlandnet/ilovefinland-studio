import Foundation
import AVFoundation
import CoreGraphics
import ImageIO

func createVideo(imagePath: String, outputPath: String, durationSeconds: Double, width: Int, height: Int) {
    let outputURL = URL(fileURLWithPath: outputPath)
    try? FileManager.default.removeItem(at: outputURL)

    guard let imageSource = CGImageSourceCreateWithURL(URL(fileURLWithPath: imagePath) as CFURL, nil),
          let cgImage = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else {
        print("Failed to load image: \(imagePath)")
        return
    }

    guard let writer = try? AVAssetWriter(outputURL: outputURL, fileType: .mp4) else {
        print("Failed to create AVAssetWriter")
        return
    }

    let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height
    ]

    let writerInput = AVAssetWriterInput(mediaType: .video, outputSettings: videoSettings)
    let sourcePixelBufferAttributes: [String: Any] = [
        kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32ARGB),
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height
    ]

    let pixelBufferAdaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: writerInput,
        sourcePixelBufferAttributes: sourcePixelBufferAttributes
    )

    writer.add(writerInput)
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    let fps: Int32 = 24
    let totalFrames = Int(durationSeconds * Double(fps))

    var pixelBuffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pixelBufferAdaptor.pixelBufferPool!, &pixelBuffer)

    guard let buffer = pixelBuffer else {
        print("Failed to allocate pixel buffer")
        return
    }

    CVPixelBufferLockBaseAddress(buffer, [])
    let pxData = CVPixelBufferGetBaseAddress(buffer)
    let rgbColorSpace = CGColorSpaceCreateDeviceRGB()
    let context = CGContext(
        data: pxData,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
        space: rgbColorSpace,
        bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
    )!

    // Draw image centered aspect-fill
    let imgW = CGFloat(cgImage.width)
    let imgH = CGFloat(cgImage.height)
    let scale = max(CGFloat(width) / imgW, CGFloat(height) / imgH)
    let drawW = imgW * scale
    let drawH = imgH * scale
    let drawX = (CGFloat(width) - drawW) / 2.0
    let drawY = (CGFloat(height) - drawH) / 2.0

    context.draw(cgImage, in: CGRect(x: drawX, y: drawY, width: drawW, height: drawH))
    CVPixelBufferUnlockBaseAddress(buffer, [])

    for i in 0..<totalFrames {
        while !writerInput.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.01)
        }
        let presentationTime = CMTime(value: CMTimeValue(i), timescale: fps)
        pixelBufferAdaptor.append(buffer, withPresentationTime: presentationTime)
    }

    writerInput.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting {
        semaphore.signal()
    }
    semaphore.wait()
    print("Created MP4 video: \(outputPath) (\(totalFrames) frames, \(durationSeconds)s)")
}

let clip1In = "/Users/binod721/.gemini/antigravity/scratch/ilovefinland-studio/static/assets/sample-clips/clip-1-tram-thumb.jpg"
let clip1Out = "/Users/binod721/.gemini/antigravity/scratch/ilovefinland-studio/static/assets/sample-clips/clip-1-helsinki-tram.mp4"
createVideo(imagePath: clip1In, outputPath: clip1Out, durationSeconds: 4.0, width: 540, height: 960)

let clip2In = "/Users/binod721/.gemini/antigravity/scratch/ilovefinland-studio/static/assets/sample-clips/clip-2-winter-thumb.png"
let clip2Out = "/Users/binod721/.gemini/antigravity/scratch/ilovefinland-studio/static/assets/sample-clips/clip-2-winter-lapland.mp4"
createVideo(imagePath: clip2In, outputPath: clip2Out, durationSeconds: 4.0, width: 540, height: 960)
