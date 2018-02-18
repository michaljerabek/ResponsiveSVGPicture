# ResponsiveSVGPicture

Responsive `object-fit` and `object-position` SVG "polyfill".

## Basic usage

1. Insert ResponsiveSVGPicture.js:
```html
<script src="ResponsiveSVGPicture.js"></script>
```

2. Use `noscript`:
```html
<!--Pixel ratio only:-->
<noscript class="svg-picture" 
    data-x1="img/320x200-x1.png" data-x2="img/320x200-x2.png"
>
    <svg class="some-styles" role="img" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" overflow="hidden" aria-labelledby="title">
        <title id="title">Pixel ratio only + viewbox</title>
        <!--default image:-->
        <image xlink:href="img/320x200-x1.png" x="0" y="0" width="100%" height="100%"></image>
    </svg>
</noscript>

<!--Differrent images:-->
<noscript class="svg-picture" 
    data-mq1="(max-width: 479px)" data-src1-x1="img/320x200-x1.png" data-src1-x2="img/320x200-x2.png" data-viewbox1="0 0 320 200"
    data-mq2="(min-width: 480px) and (max-width: 999px)" data-src2-x1="img/640x400-x1.png" data-src2-x2="img/640x400-x2.png" data-viewbox2="0 0 640 400"
    data-mq3="(min-width: 1000px)" data-src3-x1="img/1280x800-x1.png" data-src3-x2="img/1280x800-x2.png" data-viewbox3="0 0 1280 800"
>
    <svg class="some-styles" role="img" preserveAspectRatio="xMidYMid slice" overflow="hidden" aria-labelledby="title">
        <title id="title">Title of the image</title>
        <!--default image:-->
        <image xlink:href="img/640x400-x1.png" x="0" y="0" width="100%" height="100%"></image>
    </svg>
</noscript>
```

## Methods
* `SVGPictures.refresh()` - refreshes everything
* `SVGPictures.add(noscriptElement.svg-picture)` - processes new element

## Options
* `ResponsiveSVGPicture.AUTOLOAD` - initialize on `DOMContentLoaded` as `window.SVGPictures` (default: `true`)
* `ResponsiveSVGPicture.RESIZE_TIMEOUT` - resize debouncing (default: `100`)
* `ResponsiveSVGPicture.VIEWBOX_INTERVAL` - interval to generate viewbox (default: `30`)

