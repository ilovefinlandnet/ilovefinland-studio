import Foundation
import CoreGraphics
import CoreText
import AVFoundation
import ImageIO

func loadImage(path: String) -> CGImage? {
    guard !path.isEmpty, let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil) else { return nil }
    return CGImageSourceCreateImageAtIndex(source, 0, nil)
}

func drawNativeText(ctx: CGContext, text: String, fontName: String, fontSize: CGFloat, color: CGColor, x: CGFloat, y: CGFloat) {
    let font = CTFontCreateWithName(fontName as CFString, fontSize, nil)
    let attr: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(rawValue: kCTFontAttributeName as String): font,
        NSAttributedString.Key(rawValue: kCTForegroundColorAttributeName as String): color
    ]
    let str = CFAttributedStringCreate(nil, text as CFString, attr as CFDictionary)!
    let line = CTLineCreateWithAttributedString(str)
    ctx.textPosition = CGPoint(x: x, y: y)
    CTLineDraw(line, ctx)
}

func renderCinematicFrame(
    frameIndex: Int,
    totalFrames: Int,
    width: Int,
    height: Int,
    imgUser: CGImage?,
    imgLogo: CGImage?
) -> CGImage? {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else { return nil }

    let t = Double(frameIndex) / 30.0 // seconds (0.0 to 12.0)
    let W = CGFloat(width)
    let H = CGFloat(height)

    // Determine current scene (3.0s each)
    let sceneIdx = min(Int(t / 3.0), 3)
    let sceneTime = t - Double(sceneIdx) * 3.0
    let sceneProgress = sceneTime / 3.0

    // Smooth transition blend between scenes (0.35s = 10 frames)
    let transDuration = 0.35
    var transAlpha: CGFloat = 1.0
    if sceneTime < transDuration && sceneIdx > 0 {
        transAlpha = CGFloat(sceneTime / transDuration)
    }

    // Helper to draw background with natural camera motion (UNFLIPPED - native CoreGraphics)
    func drawSceneBg(scene: Int, progress: Double, alpha: CGFloat) {
        guard let img = imgUser else { return }
        ctx.saveGState()
        ctx.setAlpha(alpha)

        let imgW = CGFloat(img.width)   // 1024
        let imgH = CGFloat(img.height)  // 682

        if scene == 0 {
            // SCENE 1 (0–3s): Close-up tracking on the Studded Tyre rolling on right side
            // Focus right on the tyre with studs and snow spray, tracking forward
            let baseScale = (H / imgH) * 1.35
            let curScale = baseScale * (1.0 + CGFloat(progress) * 0.04)
            let drawW = imgW * curScale
            let drawH = imgH * curScale
            // Keep tyre on the right side: shift drawX towards right
            let drawX = (W - drawW) * 0.92 - CGFloat(progress) * 40.0
            let drawY = (H - drawH) * 0.25 + CGFloat(sin(progress * .pi * 4.0)) * 4.0
            ctx.draw(img, in: CGRect(x: drawX, y: drawY, width: drawW, height: drawH))
        } else if scene == 1 {
            // SCENE 2 (3–6s): Wide shot tracking along snowy Finnish road & pine forest
            // Panning slightly left to reveal more of the snowy road corridor and pine trees
            let baseScale = (H / imgH) * 1.15
            let curScale = baseScale * (1.05 - CGFloat(progress) * 0.03)
            let drawW = imgW * curScale
            let drawH = imgH * curScale
            let drawX = (W - drawW) * 0.50 + CGFloat(progress) * 35.0
            let drawY = (H - drawH) * 0.35 - CGFloat(progress) * 15.0
            ctx.draw(img, in: CGRect(x: drawX, y: drawY, width: drawW, height: drawH))
        } else if scene == 2 {
            // SCENE 3 (6–9s): Low-angle moving shot showing tyre grip and road texture
            // Three-quarter view of tyre on the right and packed snow ruts on the left
            let baseScale = (H / imgH) * 1.25
            let curScale = baseScale * (1.0 + CGFloat(progress) * 0.05)
            let drawW = imgW * curScale
            let drawH = imgH * curScale
            let drawX = (W - drawW) * 0.75 - CGFloat(progress) * 30.0
            let drawY = (H - drawH) * 0.30 + CGFloat(progress) * 20.0
            ctx.draw(img, in: CGRect(x: drawX, y: drawY, width: drawW, height: drawH))
        } else {
            // SCENE 4 (9–12s): Expansive Finnish winter landscape & forest
            // Slow cinematic crane gliding smoothly across the snowscape
            let baseScale = (H / imgH) * 1.10
            let curScale = baseScale * (1.0 + CGFloat(progress) * 0.04)
            let drawW = imgW * curScale
            let drawH = imgH * curScale
            let drawX = (W - drawW) * 0.60 + CGFloat(sin(progress * .pi)) * 25.0
            let drawY = (H - drawH) * 0.40 - CGFloat(progress) * 20.0
            ctx.draw(img, in: CGRect(x: drawX, y: drawY, width: drawW, height: drawH))
        }

        ctx.restoreGState()
    }

    // Draw background with smooth cross-dissolve if in transition
    if transAlpha < 1.0 && sceneIdx > 0 {
        drawSceneBg(scene: sceneIdx - 1, progress: 1.0, alpha: 1.0)
        drawSceneBg(scene: sceneIdx, progress: sceneProgress, alpha: transAlpha)
    } else {
        drawSceneBg(scene: sceneIdx, progress: sceneProgress, alpha: 1.0)
    }

    // Dynamic light snow spray particles behind tyre (Scene 1 & 3)
    if sceneIdx == 0 || sceneIdx == 2 {
        ctx.saveGState()
        for p in 0..<30 {
            let seed = Double(p * 43 + frameIndex * 17)
            // Snow kicks up around the tyre contact patch (lower right: x = 750..950, y = 500..800)
            let px = W * 0.78 + CGFloat((seed.truncatingRemainder(dividingBy: 240.0)) - 120.0)
            let py = H * 0.32 + CGFloat((seed * 1.9).truncatingRemainder(dividingBy: 220.0))
            let size = CGFloat(2.0 + (seed.truncatingRemainder(dividingBy: 4.5)))
            let alpha = CGFloat(0.35 + 0.45 * sin(Double(frameIndex + p) * 0.25))
            ctx.setFillColor(red: 1.0, green: 1.0, blue: 1.0, alpha: alpha)
            ctx.fillEllipse(in: CGRect(x: px, y: py, width: size, height: size))
        }
        ctx.restoreGState()
    }

    // 2. Cinematic Bottom Gradient Scrim (#0B1A2C navy base at bottom)
    // In native CoreGraphics: bottom is y=0, top is y=H.
    // Gradient starts transparent at y=H*0.52 and reaches solid navy at y=0.
    let colors = [
        CGColor(red: 0.04, green: 0.10, blue: 0.17, alpha: 0.0),
        CGColor(red: 0.04, green: 0.10, blue: 0.17, alpha: 0.55),
        CGColor(red: 0.04, green: 0.10, blue: 0.17, alpha: 0.88),
        CGColor(red: 0.04, green: 0.10, blue: 0.17, alpha: 0.98)
    ] as CFArray
    let locations: [CGFloat] = [0.0, 0.40, 0.75, 1.0]
    if let grad = CGGradient(colorsSpace: colorSpace, colors: colors, locations: locations) {
        ctx.drawLinearGradient(grad, start: CGPoint(x: 0, y: H * 0.52), end: CGPoint(x: 0, y: 0), options: [])
    }

    // 3. Heart Logo at TOP LEFT (right-side up, solid white river, no haze)
    // In native CoreGraphics: Top-left is at x = W * 0.085, y = H * 0.925 - logoSize
    if let logo = imgLogo {
        let logoSize: CGFloat = 130.0
        let logoX = W * 0.085
        let logoY = H * 0.925 - logoSize
        ctx.draw(logo, in: CGRect(x: logoX, y: logoY, width: logoSize, height: logoSize))
    }

    // 4. Safe Margin & Scene-Specific Typography (LOWER LEFT)
    let safeMarginX = W * 0.085
    let badgeY: CGFloat = 520.0

    // Content per scene
    let badgeText = "FINLAND GUIDE"
    var line1Text = "WINTER TYRES IN FINLAND"
    var line2Text = "DID YOU CHANGE YOUR TYRES YET?"
    var subText = "Required when winter conditions demand (1 Nov – 31 Mar)"

    if sceneIdx == 1 {
        line1Text = "STUDDED TYRES FOR ICY ROADS"
        line2Text = "MAXIMUM TRACTION ON ICE"
        subText = "Finnish law ties winter tyre use directly to road conditions"
    } else if sceneIdx == 2 {
        line1Text = "DRIVE SAFE THIS WINTER"
        line2Text = "CHECK 3 MM MINIMUM TREAD"
        subText = "Ensure studs are intact and book your tyre change early"
    } else if sceneIdx == 3 {
        line1Text = "CHECK BEFORE YOU DRIVE"
        line2Text = "FULL GUIDE AT ILOVEFINLAND.NET"
        subText = "Verified Finnish driving rules, dates & practical tips 🇫🇮"
    }

    // Draw Category Badge (#003882 deep navy blue)
    let badgeFont = CTFontCreateWithName("Helvetica-Bold" as CFString, 26, nil)
    let badgeStr = CFAttributedStringCreate(nil, badgeText as CFString, [
        NSAttributedString.Key(rawValue: kCTFontAttributeName as String): badgeFont,
        NSAttributedString.Key(rawValue: kCTForegroundColorAttributeName as String): CGColor(red: 1, green: 1, blue: 1, alpha: 1)
    ] as CFDictionary)!
    let badgeLine = CTLineCreateWithAttributedString(badgeStr)
    let badgeTextW = CGFloat(CTLineGetTypographicBounds(badgeLine, nil, nil, nil))
    let badgeW = badgeTextW + 36.0
    let badgeH: CGFloat = 46.0

    ctx.saveGState()
    ctx.setFillColor(red: 0.0, green: 0.22, blue: 0.51, alpha: 1.0) // Deep Finnish Blue #003882
    let badgePath = CGPath(roundedRect: CGRect(x: safeMarginX, y: badgeY, width: badgeW, height: badgeH), cornerWidth: 10, cornerHeight: 10, transform: nil)
    ctx.addPath(badgePath)
    ctx.fillPath()
    ctx.restoreGState()

    drawNativeText(ctx: ctx, text: badgeText, fontName: "Helvetica-Bold", fontSize: 26, color: CGColor(red: 1, green: 1, blue: 1, alpha: 1), x: safeMarginX + 18.0, y: badgeY + 12.0)

    // Line 1: White Headline
    drawNativeText(ctx: ctx, text: line1Text, fontName: "Helvetica-Bold", fontSize: 52, color: CGColor(red: 1, green: 1, blue: 1, alpha: 1), x: safeMarginX, y: badgeY - 70.0)

    // Line 2: Electric Bright Blue (#00A3FF)
    let electricBlue = CGColor(red: 0.0, green: 0.64, blue: 1.0, alpha: 1.0)
    drawNativeText(ctx: ctx, text: line2Text, fontName: "Helvetica-Bold", fontSize: 44, color: electricBlue, x: safeMarginX, y: badgeY - 135.0)

    // Subtitle
    let slateGrey = CGColor(red: 0.85, green: 0.89, blue: 0.94, alpha: 1.0)
    drawNativeText(ctx: ctx, text: subText, fontName: "Helvetica", fontSize: 28, color: slateGrey, x: safeMarginX, y: badgeY - 190.0)

    return ctx.makeImage()
}

func main() {
    guard CommandLine.arguments.count > 2 else {
        print("Usage: render_winter_tyre_reel <config.json> <output.mp4>")
        exit(1)
    }

    let configPath = CommandLine.arguments[1]
    let finalOutputPath = CommandLine.arguments[2]

    guard let configData = try? Data(contentsOf: URL(fileURLWithPath: configPath)),
          let config = try? JSONSerialization.jsonObject(with: configData) as? [String: Any] else {
        fatalError("Failed to parse config at \(configPath)")
    }

    let width = config["width"] as? Int ?? 1080
    let height = config["height"] as? Int ?? 1920
    let fps: Int32 = Int32(config["fps"] as? Int ?? 30)
    let duration = config["duration_sec"] as? Double ?? 12.0
    let totalFrames = Int(duration * Double(fps))

    let userPhotoPath = config["user_photo_path"] as? String ?? ""
    let logoPhotoPath = config["logo_photo_path"] as? String ?? ""
    let audioWavPath = config["audio_wav_path"] as? String ?? ""

    let imgUser = loadImage(path: userPhotoPath)
    let imgLogo = loadImage(path: logoPhotoPath)

    print("Loaded assets: user=\(imgUser != nil), logo=\(imgLogo != nil)")

    let tempVideoPath = "/tmp/reel_raw_video_\(UUID().uuidString).mp4"
    let tempVideoURL = URL(fileURLWithPath: tempVideoPath)
    try? FileManager.default.removeItem(at: tempVideoURL)

    guard let writer = try? AVAssetWriter(outputURL: tempVideoURL, fileType: .mp4) else {
        fatalError("Failed to create AVAssetWriter")
    }

    let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 8_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
        ]
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

    var pixelBuffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, pixelBufferAdaptor.pixelBufferPool!, &pixelBuffer)
    guard let buffer = pixelBuffer else { fatalError("Failed to allocate pixel buffer") }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bytesPerRow = CVPixelBufferGetBytesPerRow(buffer)

    print("Rendering \(totalFrames) cinematic frames at \(width)x\(height) @ \(fps)fps...")

    for i in 0..<totalFrames {
        if i % 60 == 0 {
            print("  • Frame \(i)/\(totalFrames) (\(String(format: "%.1f", Double(i)/Double(fps)))s / \(duration)s)...")
        }

        guard let frameImg = renderCinematicFrame(
            frameIndex: i,
            totalFrames: totalFrames,
            width: width,
            height: height,
            imgUser: imgUser,
            imgLogo: imgLogo
        ) else { continue }

        while !writerInput.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.002)
        }

        CVPixelBufferLockBaseAddress(buffer, [])
        let pxData = CVPixelBufferGetBaseAddress(buffer)
        if let frameCtx = CGContext(
            data: pxData,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
        ) {
            frameCtx.draw(frameImg, in: CGRect(x: 0, y: 0, width: width, height: height))
        }
        CVPixelBufferUnlockBaseAddress(buffer, [])

        let presentationTime = CMTime(value: CMTimeValue(i), timescale: fps)
        pixelBufferAdaptor.append(buffer, withPresentationTime: presentationTime)
    }

    writerInput.markAsFinished()
    let sema = DispatchSemaphore(value: 0)
    writer.finishWriting { sema.signal() }
    sema.wait()

    print("✓ Raw video rendered successfully (\(tempVideoPath))")

    // Mux with audio track
    let finalURL = URL(fileURLWithPath: finalOutputPath)
    try? FileManager.default.removeItem(at: finalURL)

    if !audioWavPath.isEmpty && FileManager.default.fileExists(atPath: audioWavPath) {
        print("Muxing audio track (\(audioWavPath)) with video...")
        let comp = AVMutableComposition()
        let videoAsset = AVURLAsset(url: tempVideoURL)
        let audioAsset = AVURLAsset(url: URL(fileURLWithPath: audioWavPath))

        if let vTrack = videoAsset.tracks(withMediaType: .video).first,
           let compVTrack = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) {
            try? compVTrack.insertTimeRange(CMTimeRange(start: .zero, duration: videoAsset.duration), of: vTrack, at: .zero)
        }

        if let aTrack = audioAsset.tracks(withMediaType: .audio).first,
           let compATrack = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
            let dur = min(videoAsset.duration, audioAsset.duration)
            try? compATrack.insertTimeRange(CMTimeRange(start: .zero, duration: dur), of: aTrack, at: .zero)
        }

        if let export = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality) {
            export.outputURL = finalURL
            export.outputFileType = .mp4
            let expSema = DispatchSemaphore(value: 0)
            export.exportAsynchronously {
                expSema.signal()
            }
            expSema.wait()
            print("✓ Export finished with status: \(export.status.rawValue)")
        }
        try? FileManager.default.removeItem(at: tempVideoURL)
    } else {
        try? FileManager.default.moveItem(at: tempVideoURL, to: finalURL)
    }

    print("SUCCESS: 1080x1920 Cinematic Reel exported to \(finalOutputPath)")
}

main()
