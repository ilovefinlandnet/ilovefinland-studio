import Foundation
import CoreGraphics
import CoreText
import ImageIO

let width = 540
let height = 960
let colorSpace = CGColorSpaceCreateDeviceRGB()
guard let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
    fatalError("Failed to create context")
}

// Background
ctx.setFillColor(red: 0.05, green: 0.08, blue: 0.15, alpha: 1.0)
ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))

// Top-left origin convention (y=0 top, y=960 bottom)
ctx.saveGState()
ctx.translateBy(x: 0, y: CGFloat(height))
ctx.scaleBy(x: 1.0, y: -1.0)

// In this flipped context:
// An un-flipped text drawing function:
func drawText(ctx: CGContext, text: String, fontName: String, fontSize: CGFloat, color: CGColor, x: CGFloat, y: CGFloat) {
    ctx.saveGState()
    // To draw text right side up in a flipped context, we move to (x, y) then invert y scale
    ctx.translateBy(x: x, y: y)
    ctx.scaleBy(x: 1.0, y: -1.0)
    
    let font = CTFontCreateWithName(fontName as CFString, fontSize, nil)
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

drawText(ctx: ctx, text: "FINLAND SAYS “KYLLÄ”", fontName: "Helvetica-Bold", fontSize: 32, color: CGColor(red: 1, green: 1, blue: 1, alpha: 1), x: 50, y: 700)
drawText(ctx: ctx, text: "ASSISTED DRIVING!", fontName: "Helvetica-Bold", fontSize: 38, color: CGColor(red: 0, green: 0.64, blue: 1.0, alpha: 1), x: 50, y: 750)

ctx.restoreGState()

guard let img = ctx.makeImage() else { fatalError() }
let outURL = URL(fileURLWithPath: "/tmp/test_flip_out.png") as CFURL
guard let dest = CGImageDestinationCreateWithURL(outURL, "public.png" as CFString, 1, nil) else { fatalError() }
CGImageDestinationAddImage(dest, img, nil)
CGImageDestinationFinalize(dest)
print("Saved /tmp/test_flip_out.png successfully!")
