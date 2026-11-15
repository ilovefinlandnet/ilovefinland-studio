import Foundation
import CoreGraphics
import CoreText
import ImageIO

let width = 540
let height = 960
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
    fatalError("Failed to create CGContext")
}

// Background
ctx.setFillColor(red: 0.05, green: 0.1, blue: 0.2, alpha: 1.0)
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

// Text with font size 38
let font = CTFontCreateWithName("Helvetica-Bold" as CFString, 38, nil)
let attr: [NSAttributedString.Key: Any] = [
    NSAttributedString.Key(rawValue: kCTFontAttributeName as String): font,
    NSAttributedString.Key(rawValue: kCTForegroundColorAttributeName as String): CGColor(red: 0, green: 0.64, blue: 1.0, alpha: 1.0)
]
let str = CFAttributedStringCreate(nil, "ASSISTED DRIVING!" as CFString, attr as CFDictionary)
let line = CTLineCreateWithAttributedString(str!)
ctx.textPosition = CGPoint(x: 50, y: 300)
CTLineDraw(line, ctx)

guard let img = ctx.makeImage() else { fatalError() }
let outURL = URL(fileURLWithPath: "/tmp/test_out.png") as CFURL
guard let dest = CGImageDestinationCreateWithURL(outURL, "public.png" as CFString, 1, nil) else { fatalError() }
CGImageDestinationAddImage(dest, img, nil)
CGImageDestinationFinalize(dest)
print("Saved /tmp/test_out.png successfully!")
