import Foundation
import CoreGraphics
import CoreText
import AVFoundation
import ImageIO

struct SceneConfig: Codable {
    let start_sec: Double
    let end_sec: Double
    let image_path: String
    let badge: String?
    let tag: String?
    let line1: String?
    let line2: String?
    let line2_color: String?
    let line3: String?
    let line2_highlight: String?
    let subtitle: String?
    let is_outro: Bool?
    let transition: String?
}

struct ReelConfig: Codable {
    let width: Int?
    let height: Int?
    let fps: Int?
    let duration_sec: Double?
    let bg_image_path: String?
    let logo_image_path: String?
    let logo_x_pct: Double?
    let logo_y_pct: Double?
    let logo_size_px: Double?
    let badge_text: String?
    let line1_text: String?
    let line2_text: String?
    let line2_font_px: Int?
    let subtitle_text: String?
    let audio_track_path: String?
    let output_path: String
    let scenes: [SceneConfig]?
}

func drawText(ctx: CGContext, text: String, fontName: String, fontSize: CGFloat, color: CGColor, x: CGFloat, yFromBottom: CGFloat, withHalo: Bool = false) {
    ctx.saveGState()
    ctx.translateBy(x: x, y: yFromBottom)
    let font = CTFontCreateWithName(fontName as CFString, fontSize, nil)

    if withHalo {
        ctx.saveGState()
        ctx.setShadow(offset: CGSize(width: 0, height: -2), blur: 8, color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.85))
        let strokeAttr: [NSAttributedString.Key: Any] = [
            NSAttributedString.Key(rawValue: kCTFontAttributeName as String): font,
            NSAttributedString.Key(rawValue: kCTForegroundColorAttributeName as String): CGColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 0.95),
            NSAttributedString.Key(rawValue: kCTStrokeWidthAttributeName as String): 3.5,
            NSAttributedString.Key(rawValue: kCTStrokeColorAttributeName as String): CGColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 0.95)
        ]
        if let strokeStr = CFAttributedStringCreate(nil, text as CFString, strokeAttr as CFDictionary) {
            let strokeLine = CTLineCreateWithAttributedString(strokeStr)
            ctx.textPosition = .zero
            CTLineDraw(strokeLine, ctx)
        }
        ctx.restoreGState()
    }

    let attr: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(rawValue: kCTFontAttributeName as String): font,
        NSAttributedString.Key(rawValue: kCTForegroundColorAttributeName as String): color
    ]
    let str = CFAttributedStringCreate(nil, text as CFString, attr as CFDictionary)
    let line = CTLineCreateWithAttributedString(str!)
    ctx.textPosition = .zero
    CTLineDraw(line, ctx)
    ctx.restoreGState()
}

func drawCenteredText(ctx: CGContext, text: String, fontName: String, fontSize: CGFloat, color: CGColor, screenWidth: CGFloat, yFromBottom: CGFloat) {
    ctx.saveGState()
    let font = CTFontCreateWithName(fontName as CFString, fontSize, nil)
    let attr: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(rawValue: kCTFontAttributeName as String): font,
        NSAttributedString.Key(rawValue: kCTForegroundColorAttributeName as String): color
    ]
    let str = CFAttributedStringCreate(nil, text as CFString, attr as CFDictionary)
    let line = CTLineCreateWithAttributedString(str!)
    let textW = CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
    let x = (screenWidth - textW) / 2.0
    ctx.translateBy(x: x, y: yFromBottom)
    ctx.textPosition = .zero
    CTLineDraw(line, ctx)
    ctx.restoreGState()
}

func wrapLines(text: String, font: CTFont, maxWidth: CGFloat) -> [String] {
    let words = text.split(separator: " ").map { String($0) }
    if words.isEmpty { return [] }
    
    var lines: [String] = []
    var current = ""
    for w in words {
        let test = current.isEmpty ? w : "\(current) \(w)"
        let attr: [NSAttributedString.Key: Any] = [NSAttributedString.Key(rawValue: kCTFontAttributeName as String): font]
        let str = CFAttributedStringCreate(nil, test as CFString, attr as CFDictionary)
        let line = CTLineCreateWithAttributedString(str!)
        let wPx = CGFloat(CTLineGetTypographicBounds(line, nil, nil, nil))
        if wPx > maxWidth && !current.isEmpty {
            lines.append(current)
            current = w
        } else {
            current = test
        }
    }
    if !current.isEmpty {
        lines.append(current)
    }
    return lines
}

func drawCoverImage(ctx: CGContext, img: CGImage, width: Int, height: Int, zoom: CGFloat, alpha: CGFloat = 1.0) {
    ctx.saveGState()
    ctx.setAlpha(alpha)
    let imgW = CGFloat(img.width)
    let imgH = CGFloat(img.height)
    let scale = max(CGFloat(width) / imgW, CGFloat(height) / imgH) * zoom
    let dw = imgW * scale
    let dh = imgH * scale
    let dx = (CGFloat(width) - dw) / 2.0
    let dy = (CGFloat(height) - dh) / 2.0
    // In CoreGraphics native space, (0,0) is bottom-left, y grows upwards.
    // CGContextDrawImage draws the image right-side up in native space.
    ctx.draw(img, in: CGRect(x: dx, y: dy, width: dw, height: dh))
    ctx.restoreGState()
}

func exportCleanMP4(configPath: String) {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: configPath)),
          let config = try? JSONDecoder().decode(ReelConfig.self, from: data) else {
        fatalError("Failed to parse config at \(configPath)")
    }

    let width = config.width ?? 540
    let height = config.height ?? 960
    let fps: Int32 = Int32(config.fps ?? 24)
    let duration = config.duration_sec ?? 16.0
    let totalFrames = Int(duration * Double(fps))

    // Pre-cache scene images and video frame generators
    var sceneImages: [CGImage?] = []
    var videoGenerators: [Int: AVAssetImageGenerator] = [:]
    let scenes = config.scenes ?? []
    for (idx, sc) in scenes.enumerated() {
        let lower = sc.image_path.lowercased()
        if lower.hasSuffix(".mp4") || lower.hasSuffix(".mov") || lower.hasSuffix(".m4v") || lower.hasSuffix(".webm") {
            let asset = AVURLAsset(url: URL(fileURLWithPath: sc.image_path))
            let gen = AVAssetImageGenerator(asset: asset)
            gen.appliesPreferredTrackTransform = true
            gen.requestedTimeToleranceBefore = .zero
            gen.requestedTimeToleranceAfter = .zero
            videoGenerators[idx] = gen
            sceneImages.append(nil)
        } else if let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: sc.image_path) as CFURL, nil),
                  let img = CGImageSourceCreateImageAtIndex(src, 0, nil) {
            sceneImages.append(img)
        } else {
            sceneImages.append(nil)
        }
    }

    // Fallback single background image
    var fallbackImg: CGImage? = nil
    if let bgPath = config.bg_image_path,
       let bgSrc = CGImageSourceCreateWithURL(URL(fileURLWithPath: bgPath) as CFURL, nil) {
        fallbackImg = CGImageSourceCreateImageAtIndex(bgSrc, 0, nil)
    }

    // Logo image
    var logoImg: CGImage? = nil
    if let logoPath = config.logo_image_path,
       let lSrc = CGImageSourceCreateWithURL(URL(fileURLWithPath: logoPath) as CFURL, nil) {
        logoImg = CGImageSourceCreateImageAtIndex(lSrc, 0, nil)
    }

    func getSceneFrame(index: Int, timeInScene: Double) -> CGImage? {
        guard scenes.indices.contains(index) else { return fallbackImg }
        if let img = sceneImages[index] {
            return img
        }
        if let gen = videoGenerators[index] {
            let cmTime = CMTime(seconds: max(0.0, timeInScene), preferredTimescale: 600)
            if let frame = try? gen.copyCGImage(at: cmTime, actualTime: nil) {
                return frame
            }
        }
        return fallbackImg
    }

    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let rawVideoURL = URL(fileURLWithPath: "/tmp/raw_reel_\(UUID().uuidString).mp4")
    try? FileManager.default.removeItem(at: rawVideoURL)

    guard let writer = try? AVAssetWriter(outputURL: rawVideoURL, fileType: .mp4) else {
        fatalError("Failed to create AVAssetWriter")
    }

    let videoSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 4500000,
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

    let safeLeft = CGFloat(width) * 0.085 // ~46px (Instagram post alignment)
    let maxTextWidth = CGFloat(width) - safeLeft * 2.0

    for i in 0..<totalFrames {
        let t = Double(i) / Double(fps)

        while !writerInput.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.004)
        }

        var pixelBuffer: CVPixelBuffer?
        let poolStatus = CVPixelBufferPoolCreatePixelBuffer(nil, pixelBufferAdaptor.pixelBufferPool!, &pixelBuffer)
        guard poolStatus == kCVReturnSuccess, let buffer = pixelBuffer else {
            Thread.sleep(forTimeInterval: 0.005)
            continue
        }

        // Find active scene
        var activeSceneIndex = 0
        if !scenes.isEmpty {
            for (idx, sc) in scenes.enumerated() {
                if t >= sc.start_sec && t < sc.end_sec {
                    activeSceneIndex = idx
                    break
                }
                if t >= sc.end_sec {
                    activeSceneIndex = idx
                }
            }
        }

        let curScene: SceneConfig? = scenes.indices.contains(activeSceneIndex) ? scenes[activeSceneIndex] : nil
        let sStart = curScene?.start_sec ?? 0.0
        let sEnd = curScene?.end_sec ?? duration
        let sDur = max(0.1, sEnd - sStart)
        let sProgress = max(0.0, min(1.0, (t - sStart) / sDur))
        let zoom = 1.02 + CGFloat(sProgress) * 0.07

        CVPixelBufferLockBaseAddress(buffer, [])
        let pxData = CVPixelBufferGetBaseAddress(buffer)
        guard let ctx = CGContext(
            data: pxData,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: CVPixelBufferGetBytesPerRow(buffer),
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
        ) else {
            CVPixelBufferUnlockBaseAddress(buffer, [])
            continue
        }

        let isOutro = curScene?.is_outro ?? false

        if isOutro {
            // ================= DEDICATED CLOSING BRANDED OUTRO CARD =================
            let transDur: Double = 0.60
            let isTransition = activeSceneIndex > 0 && (t - sStart) < transDur

            // Deep Midnight Blue Background
            if isTransition {
                let prevIdx = activeSceneIndex - 1
                let prevScene = scenes[prevIdx]
                let prevTime = t - prevScene.start_sec
                if let prevImg = getSceneFrame(index: prevIdx, timeInScene: prevTime) {
                    drawCoverImage(ctx: ctx, img: prevImg, width: width, height: height, zoom: 1.09, alpha: 1.0)
                }
                let p = CGFloat((t - sStart) / transDur)
                let smoothBlend = p * p * (3.0 - 2.0 * p)
                ctx.saveGState()
                ctx.setAlpha(smoothBlend)
                ctx.setFillColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 1.0)
                ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
                ctx.restoreGState()
            } else {
                ctx.setFillColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 1.0)
                ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
            }

            // Radial Glow Behind Logo
            let outroLogoSize: CGFloat = 116.0
            let outroLogoX = (CGFloat(width) - outroLogoSize) / 2.0
            let outroLogoY = CGFloat(height) * 0.51
            let logoCenterY = outroLogoY + outroLogoSize / 2.0

            let glowColors = [
                CGColor(red: 0.0, green: 0.42, blue: 0.95, alpha: 0.42),
                CGColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 0.0)
            ] as CFArray
            if let radial = CGGradient(colorsSpace: colorSpace, colors: glowColors, locations: [0.0, 1.0]) {
                ctx.drawRadialGradient(
                    radial,
                    startCenter: CGPoint(x: CGFloat(width) / 2.0, y: logoCenterY),
                    startRadius: 10,
                    endCenter: CGPoint(x: CGFloat(width) / 2.0, y: logoCenterY),
                    endRadius: CGFloat(width) * 0.65,
                    options: []
                )
            }

            // Smooth In-Fade for Outro Content
            let outroFade = min(1.0, CGFloat((t - sStart) / 0.45))
            ctx.saveGState()
            ctx.setAlpha(outroFade)

            // 1. Centered Glowing Heart Logo (116px - Prominent & Authoritative)
            if let lImg = logoImg {
                ctx.saveGState()
                ctx.setShadow(offset: CGSize(width: 0, height: 0), blur: 24, color: CGColor(red: 0.0, green: 0.64, blue: 1.0, alpha: 0.75))
                let lRect = CGRect(x: outroLogoX, y: outroLogoY, width: outroLogoSize, height: outroLogoSize)
                ctx.draw(lImg, in: lRect)
                ctx.restoreGState()
            }

            // 2. Centered Pill Badge: "DISCOVER MORE"
            let badgeText = "DISCOVER MORE"
            let badgeFont = CTFontCreateWithName("Helvetica-Bold" as CFString, 13, nil)
            let badgeAttr = [
                NSAttributedString.Key(rawValue: kCTFontAttributeName as String): badgeFont,
                NSAttributedString.Key(rawValue: kCTForegroundColorAttributeName as String): CGColor(red: 1, green: 1, blue: 1, alpha: 1)
            ] as CFDictionary
            let badgeStr = CFAttributedStringCreate(nil, badgeText as CFString, badgeAttr)
            let badgeLine = CTLineCreateWithAttributedString(badgeStr!)
            let bTextW = CGFloat(CTLineGetTypographicBounds(badgeLine, nil, nil, nil))
            let bPadX: CGFloat = 18.0
            let bW = bTextW + bPadX * 2.0
            let bH: CGFloat = 28.0
            let bX = (CGFloat(width) - bW) / 2.0
            let bY = outroLogoY - 48.0

            ctx.saveGState()
            ctx.setFillColor(red: 0.0, green: 0.22, blue: 0.51, alpha: 1.0) // Deep Finnish Blue #003882
            let bRect = CGRect(x: bX, y: bY, width: bW, height: bH)
            let bPath = CGPath(roundedRect: bRect, cornerWidth: 14, cornerHeight: 14, transform: nil)
            ctx.addPath(bPath)
            ctx.fillPath()
            ctx.restoreGState()

            drawCenteredText(ctx: ctx, text: badgeText, fontName: "Helvetica-Bold", fontSize: 13, color: CGColor(red: 1, green: 1, blue: 1, alpha: 1), screenWidth: CGFloat(width), yFromBottom: bY + 8.0)

            // 3. Bold Headline: "FALL IN LOVE WITH FINLAND."
            let titleY = bY - 48.0
            drawCenteredText(ctx: ctx, text: "FALL IN LOVE WITH FINLAND.", fontName: "Helvetica-Bold", fontSize: 24, color: CGColor(red: 1, green: 1, blue: 1, alpha: 1), screenWidth: CGFloat(width), yFromBottom: titleY)

            // 4. Call To Action: "VISIT www.ilovefinland.net"
            let ctaY = titleY - 36.0
            let electricBlue = CGColor(red: 0.0, green: 0.64, blue: 1.0, alpha: 1.0)
            drawCenteredText(ctx: ctx, text: "VISIT www.ilovefinland.net", fontName: "Helvetica-Bold", fontSize: 18, color: electricBlue, screenWidth: CGFloat(width), yFromBottom: ctaY)

            // 5. Tagline: "YOUR FINLAND, DISCOVERED."
            let tagY = ctaY - 28.0
            let lightGrey = CGColor(red: 0.88, green: 0.91, blue: 0.94, alpha: 1.0)
            drawCenteredText(ctx: ctx, text: "YOUR FINLAND, DISCOVERED.", fontName: "Helvetica-Bold", fontSize: 14, color: lightGrey, screenWidth: CGFloat(width), yFromBottom: tagY)

            ctx.restoreGState() // outroFade restore

        } else {
            // ================= REGULAR STORY SCENE =================
            // 1. Draw Active Scene Image/Video with Transition Style
            let activeImg = getSceneFrame(index: activeSceneIndex, timeInScene: t - sStart) ?? fallbackImg
            let transType = curScene?.transition ?? "dissolve"
            let transDur: Double = (transType == "cut") ? 0.0 : 0.50
            let isTransition = activeSceneIndex > 0 && transType != "cut" && (t - sStart) < transDur

            if isTransition {
                let prevIdx = activeSceneIndex - 1
                let prevScene = scenes[prevIdx]
                let prevTime = t - prevScene.start_sec
                let prevImg = getSceneFrame(index: prevIdx, timeInScene: prevTime) ?? fallbackImg
                let p = CGFloat((t - sStart) / transDur)
                let smoothBlend = p * p * (3.0 - 2.0 * p)

                if transType == "fade_black" {
                    // Dip to black
                    let fadeAlpha = (p < 0.5) ? (1.0 - p * 2.0) : 0.0
                    let inAlpha = (p >= 0.5) ? ((p - 0.5) * 2.0) : 0.0
                    if p < 0.5 {
                        if let pImg = prevImg {
                            drawCoverImage(ctx: ctx, img: pImg, width: width, height: height, zoom: 1.05, alpha: fadeAlpha)
                        }
                    } else if let img = activeImg {
                        drawCoverImage(ctx: ctx, img: img, width: width, height: height, zoom: zoom, alpha: inAlpha)
                    }
                } else if transType == "zoom_push" {
                    // Outgoing zoom out, incoming push in
                    if let pImg = prevImg {
                        drawCoverImage(ctx: ctx, img: pImg, width: width, height: height, zoom: 1.05 + p * 0.1, alpha: 1.0 - smoothBlend)
                    }
                    if let img = activeImg {
                        drawCoverImage(ctx: ctx, img: img, width: width, height: height, zoom: 0.95 + p * 0.1, alpha: smoothBlend)
                    }
                } else {
                    // Standard smooth cross-dissolve
                    if let pImg = prevImg {
                        drawCoverImage(ctx: ctx, img: pImg, width: width, height: height, zoom: 1.09, alpha: 1.0)
                    }
                    if let img = activeImg {
                        drawCoverImage(ctx: ctx, img: img, width: width, height: height, zoom: zoom, alpha: smoothBlend)
                    }
                }
            } else if let img = activeImg {
                drawCoverImage(ctx: ctx, img: img, width: width, height: height, zoom: zoom, alpha: 1.0)
            } else {
                ctx.setFillColor(red: 0.02, green: 0.05, blue: 0.12, alpha: 1.0)
                ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
            }

            // 2. Protective Broadcast-Grade Navy Gradient Scrim (100% Contrast against Snow & Daylight)
            let colors = [
                CGColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 0.0),
                CGColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 0.42),
                CGColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 0.74),
                CGColor(red: 0.01, green: 0.02, blue: 0.06, alpha: 0.90)
            ] as CFArray
            let locations: [CGFloat] = [0.0, 0.28, 0.65, 1.0]
            if let gradient = CGGradient(colorsSpace: colorSpace, colors: colors, locations: locations) {
                ctx.drawLinearGradient(
                    gradient,
                    start: CGPoint(x: 0, y: CGFloat(height) * 0.52),
                    end: CGPoint(x: 0, y: 0),
                    options: []
                )
            }

            // 3. Heart Logo - TOP-LEFT (Exact 12.0% width proportion matching Instagram Feed Post: 130px on 1080p, 65px on 540p)
            let logoSize: CGFloat = round(CGFloat(width) * 0.120)
            let safeTop = CGFloat(height) * 0.148 // Instagram 4:5 / 9:16 safe area top margin
            let logoX = safeLeft + 8.0 // 8px inside left safe line
            let logoYFromTop = safeTop + 14.0 // 14px inside top safe line
            let logoY = CGFloat(height) - logoYFromTop - logoSize
            if let lImg = logoImg {
                ctx.saveGState()
                ctx.setShadow(offset: CGSize(width: 0, height: -2), blur: 6, color: CGColor(red: 0, green: 0, blue: 0, alpha: 0.50))
                let logoRect = CGRect(x: logoX, y: logoY, width: logoSize, height: logoSize)
                ctx.draw(lImg, in: logoRect)
                ctx.restoreGState()
            }

            // 4. Scene Typography - Exact Instagram Safe-Area Left Alignment with Smooth Fade
            let textFadeIn = min(1.0, CGFloat((t - sStart) / 0.40))
            let textFadeOut = (activeSceneIndex < scenes.count - 1) ? min(1.0, CGFloat((sEnd - t) / 0.40)) : 1.0
            let textOpacity = max(0.0, min(1.0, textFadeIn * textFadeOut))

            ctx.saveGState()
            ctx.setAlpha(textOpacity)

            let badgeRaw = curScene?.badge ?? curScene?.tag ?? config.badge_text ?? "LAPLAND"
            let badgeText = (badgeRaw.contains("•") ? badgeRaw.components(separatedBy: "•").last!.trimmingCharacters(in: .whitespaces) : badgeRaw).uppercased()

            let line1Text = (curScene?.line1 ?? config.line1_text ?? "").uppercased()
            let line2Text = curScene?.line2 ?? config.line2_text ?? ""
            let line3Text = curScene?.line3 ?? curScene?.line2_highlight ?? ""
            let subtitleText = curScene?.subtitle ?? config.subtitle_text ?? ""

            let headlineFontSize = CGFloat(config.line2_font_px ?? 28)

            var yCur = CGFloat(height) * 0.38 // ~365px from bottom

            // Pill Badge
            if !badgeText.isEmpty {
                let badgeFont = CTFontCreateWithName("Helvetica-Bold" as CFString, 13, nil)
                let badgeStr = CFAttributedStringCreate(nil, badgeText as CFString, [
                    NSAttributedString.Key(rawValue: kCTFontAttributeName as String): badgeFont,
                    NSAttributedString.Key(rawValue: kCTForegroundColorAttributeName as String): CGColor(red: 1, green: 1, blue: 1, alpha: 1)
                ] as CFDictionary)
                let badgeLine = CTLineCreateWithAttributedString(badgeStr!)
                let badgeTextWidth = CGFloat(CTLineGetTypographicBounds(badgeLine, nil, nil, nil))
                let badgeW = badgeTextWidth + 24.0
                let badgeH: CGFloat = 26.0

                ctx.saveGState()
                ctx.setFillColor(red: 0.0, green: 0.22, blue: 0.51, alpha: 1.0) // Deep Finnish Blue #003882
                let badgeRect = CGRect(x: safeLeft, y: yCur - badgeH, width: badgeW, height: badgeH)
                let badgePath = CGPath(roundedRect: badgeRect, cornerWidth: 6, cornerHeight: 6, transform: nil)
                ctx.addPath(badgePath)
                ctx.fillPath()
                ctx.restoreGState()

                drawText(ctx: ctx, text: badgeText, fontName: "Helvetica-Bold", fontSize: 13, color: CGColor(red: 1, green: 1, blue: 1, alpha: 1), x: safeLeft + 12.0, yFromBottom: yCur - badgeH + 7.0)
                yCur -= (badgeH + 16.0)
            }

            // Line 1: Bold White (Using unified headlineFontSize with protective contrast halo)
            if !line1Text.isEmpty {
                let l1Font = CTFontCreateWithName("Helvetica-Bold" as CFString, headlineFontSize, nil)
                let l1Lines = wrapLines(text: line1Text, font: l1Font, maxWidth: maxTextWidth)
                for line in l1Lines {
                    drawText(ctx: ctx, text: line, fontName: "Helvetica-Bold", fontSize: headlineFontSize, color: CGColor(red: 1, green: 1, blue: 1, alpha: 1), x: safeLeft, yFromBottom: yCur - headlineFontSize * 0.90, withHalo: true)
                    yCur -= headlineFontSize * 1.18
                }
            }

            // Line 2: Bold White or Ice Blue (Using same unified headlineFontSize with protective contrast halo)
            if !line2Text.isEmpty {
                let l2Font = CTFontCreateWithName("Helvetica-Bold" as CFString, headlineFontSize, nil)
                let l2Lines = wrapLines(text: line2Text, font: l2Font, maxWidth: maxTextWidth)
                let iceBlueColor = CGColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1.0) // Ice Blue #38BDF8
                let l2Color = (curScene?.line2_color == "blue") ? iceBlueColor : CGColor(red: 1, green: 1, blue: 1, alpha: 1)
                for line in l2Lines {
                    drawText(ctx: ctx, text: line, fontName: "Helvetica-Bold", fontSize: headlineFontSize, color: l2Color, x: safeLeft, yFromBottom: yCur - headlineFontSize * 0.90, withHalo: true)
                    yCur -= headlineFontSize * 1.18
                }
            }

            // Line 3: Electric Ice Blue (#38BDF8) (Using same unified headlineFontSize with protective contrast halo)
            if !line3Text.isEmpty && line3Text != line2Text {
                let l3Font = CTFontCreateWithName("Helvetica-Bold" as CFString, headlineFontSize, nil)
                let l3Lines = wrapLines(text: line3Text, font: l3Font, maxWidth: maxTextWidth)
                let iceBlueColor = CGColor(red: 0.22, green: 0.74, blue: 0.97, alpha: 1.0)
                for line in l3Lines {
                    drawText(ctx: ctx, text: line, fontName: "Helvetica-Bold", fontSize: headlineFontSize, color: iceBlueColor, x: safeLeft, yFromBottom: yCur - headlineFontSize * 0.90, withHalo: true)
                    yCur -= headlineFontSize * 1.18
                }
            }

            // Subtitle Narration Box
            if !subtitleText.isEmpty {
                yCur -= 6.0
                let subFont = CTFontCreateWithName("Helvetica" as CFString, 14, nil)
                let subLines = wrapLines(text: subtitleText, font: subFont, maxWidth: maxTextWidth - 28.0)
                let subLineH: CGFloat = 19.0
                let subBoxH = CGFloat(subLines.count) * subLineH + 14.0

                ctx.saveGState()
                ctx.setFillColor(red: 0.01, green: 0.03, blue: 0.08, alpha: 0.78)
                let subBoxRect = CGRect(x: safeLeft, y: yCur - subBoxH, width: maxTextWidth, height: subBoxH)
                let subPath = CGPath(roundedRect: subBoxRect, cornerWidth: 8, cornerHeight: 8, transform: nil)
                ctx.addPath(subPath)
                ctx.fillPath()
                ctx.restoreGState()

                var sy = yCur - 18.0
                let slateGrey = CGColor(red: 0.92, green: 0.95, blue: 0.98, alpha: 1.0)
                for sLine in subLines {
                    drawText(ctx: ctx, text: sLine, fontName: "Helvetica", fontSize: 14, color: slateGrey, x: safeLeft + 12.0, yFromBottom: sy)
                    sy -= subLineH
                }
            }
            ctx.restoreGState() // textOpacity restore
        }

        CVPixelBufferUnlockBaseAddress(buffer, [])

        while !writerInput.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.004)
        }
        let presentationTime = CMTime(value: CMTimeValue(i), timescale: fps)
        pixelBufferAdaptor.append(buffer, withPresentationTime: presentationTime)
    }

    writerInput.markAsFinished()
    let sema = DispatchSemaphore(value: 0)
    writer.finishWriting { sema.signal() }
    sema.wait()

    // 5. Mux with Audio Track if present
    let finalOutputURL = URL(fileURLWithPath: config.output_path)
    try? FileManager.default.removeItem(at: finalOutputURL)

    if let audioPath = config.audio_track_path,
       FileManager.default.fileExists(atPath: audioPath) {
        let comp = AVMutableComposition()
        let videoAsset = AVURLAsset(url: rawVideoURL)
        let audioAsset = AVURLAsset(url: URL(fileURLWithPath: audioPath))

        let durationCM = CMTime(seconds: duration, preferredTimescale: 600)

        if let vTrack = videoAsset.tracks(withMediaType: .video).first,
           let compVTrack = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) {
            try? compVTrack.insertTimeRange(CMTimeRange(start: .zero, duration: durationCM), of: vTrack, at: .zero)
        }

        if let aTrack = audioAsset.tracks(withMediaType: .audio).first,
           let compATrack = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
            let aDur = audioAsset.duration
            if aDur.seconds > 0 {
                var cur = CMTime.zero
                while cur < durationCM {
                    let remain = CMTimeSubtract(durationCM, cur)
                    let take = CMTimeMinimum(aDur, remain)
                    try? compATrack.insertTimeRange(CMTimeRange(start: .zero, duration: take), of: aTrack, at: cur)
                    cur = CMTimeAdd(cur, take)
                }
            }
        }

        if let exporter = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetHighestQuality) {
            exporter.outputURL = finalOutputURL
            exporter.outputFileType = .mp4

            // Smooth Studio Audio Fade-Out over the closing outro (last 2.0s)
            if let aTrack = comp.tracks(withMediaType: .audio).first {
                let audioMix = AVMutableAudioMix()
                let mixParams = AVMutableAudioMixInputParameters(track: aTrack)
                let fadeStartSec = max(0.0, duration - 2.0)
                let fadeStartTime = CMTime(seconds: fadeStartSec, preferredTimescale: 600)
                let fadeDuration = CMTime(seconds: min(2.0, duration), preferredTimescale: 600)
                let fadeRange = CMTimeRange(start: fadeStartTime, duration: fadeDuration)
                mixParams.setVolumeRamp(fromStartVolume: 1.0, toEndVolume: 0.0, timeRange: fadeRange)
                audioMix.inputParameters = [mixParams]
                exporter.audioMix = audioMix
            }

            let expSema = DispatchSemaphore(value: 0)
            exporter.exportAsynchronously {
                expSema.signal()
            }
            expSema.wait()
        } else {
            try? FileManager.default.copyItem(at: rawVideoURL, to: finalOutputURL)
        }
    } else {
        try? FileManager.default.copyItem(at: rawVideoURL, to: finalOutputURL)
    }

    try? FileManager.default.removeItem(at: rawVideoURL)
    print("SUCCESS: Stitched multi-scene Clean MP4 exported to \(config.output_path) (\(scenes.count) scenes, \(duration)s, \(width)x\(height) @ \(fps)fps)")
}

if CommandLine.arguments.count > 1 {
    exportCleanMP4(configPath: CommandLine.arguments[1])
} else {
    print("Usage: render_clean_reel_mp4 <config.json>")
}
