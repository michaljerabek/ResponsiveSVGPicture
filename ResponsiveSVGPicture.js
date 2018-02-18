/*jslint indent: 4, white: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
(function() {

    var SELECTOR = {
        svgPicture: ".svg-picture"
    };

    var ATTR = {
        pixelRatioOnlyRegex: /^data-x([1-9]+[0-9]*)$/,
        pixelRatioSrcRegex: /^data-src([1-9]+[0-9]*)-x([1-9]+[0-9]*)$/,
        mqRegex: /^data-mq([1-9]+[0-9]*)$/,
        viewboxRegex: /^data-viewbox([1-9]+[0-9]*)$/,

        pixelRatioOnly: function (pixelRatio) {

            return "data-x" + pixelRatio;
        },
        viewbox: function (dataIndex) {

            return "data-viewbox" + dataIndex;
        },
        pixelRatioSrc: function (dataIndex, pixelRatio) {

            return "data-src" + dataIndex + "-x" + pixelRatio;
        }
    };


    var ResponsiveSVGPicture = window.ResponsiveSVGPicture = function ResponsiveSVGPicture() {

        this._resizeDebounce = null;

        window.addEventListener("resize", function () {

            clearTimeout(this._resizeDebounce);

            this._resizeDebounce = setTimeout(this.refresh.bind(this), ResponsiveSVGPicture.RESIZE_TIMEOUT);

        }.bind(this));

        this.refresh();
    };

    //Načítat automaticky (false = manuálně new ResponsiveSVGPicture());
    ResponsiveSVGPicture.AUTOLOAD = true;

    //Timeout události resize
    ResponsiveSVGPicture.RESIZE_TIMEOUT = 100;

    //Timeout intervalu testující, jestli jsou k dispozici informace o velikosti obrázku
    ResponsiveSVGPicture.VIEWBOX_INTERVAL = 30;


    ResponsiveSVGPicture.prototype._findDataIndex = function (SVGPicture) {

        var useDataIndex = 1;

        Array.prototype.forEach.call(SVGPicture.attributes, function (attr) {

            var mqAttrData = attr.name.match(ATTR.mqRegex);

            if (mqAttrData) {

                var mq = attr.value;

                if (window.matchMedia(mq).matches) {

                    useDataIndex = +mqAttrData[1];
                }
            }
        }, this);

        return useDataIndex;
    };

    ResponsiveSVGPicture.prototype._usesMQ = function (SVGPicture) {

        return Array.prototype.some.call(SVGPicture.attributes, function (attr) {
            return attr.name.match(ATTR.mqRegex);
        });
    };

    ResponsiveSVGPicture.prototype._findSVGPictureData = function (SVGPicture, dataIndex) {

        var highestSrcPixelRatio = 1,

            imageHref = "",

            usesMQ = typeof dataIndex === "number";

        Array.prototype.some.call(SVGPicture.attributes, function (attr) {

            var pixelRatioAttrData = usesMQ ? attr.name.match(ATTR.pixelRatioSrcRegex) : attr.name.match(ATTR.pixelRatioOnlyRegex);

            if (pixelRatioAttrData) {

                var sameDataIndex = +dataIndex === +pixelRatioAttrData[1];

                if (usesMQ && !sameDataIndex) {

                    return;
                }

                var srcPixelRatio = usesMQ ? +pixelRatioAttrData[2] : +pixelRatioAttrData[1];

                if (srcPixelRatio > highestSrcPixelRatio) {

                    highestSrcPixelRatio = srcPixelRatio;
                }

                if (srcPixelRatio === this.devicePixelRatio) {

                    imageHref = attr.value;

                    return true;
                }
            }
        }, this);

        if (!imageHref) {

            var srcAttr = usesMQ ? SVGPicture.attributes[ATTR.pixelRatioSrc(dataIndex || 1, highestSrcPixelRatio)] : SVGPicture.attributes[ATTR.pixelRatioOnly(highestSrcPixelRatio)];

            if (srcAttr) {

                imageHref = srcAttr.value;
            }
        }

        return {
            imageHref: imageHref,
            viewbox: usesMQ ? SVGPicture.getAttribute(ATTR.viewbox(dataIndex)) || null : null
        };
    };

    ResponsiveSVGPicture.prototype._copyAttrsFromNoscriptToSVG = function (SVGPictureData, svg) {

        Array.prototype.forEach.call(SVGPictureData.element.attributes, function (attr) {

            if (attr.name === "class") {

                svg.setAttribute(attr.name, (svg.getAttribute("class") || "") + " " + attr.value);

                return;
            }

            if (attr.name.match(ATTR.mqRegex) || attr.name.match(ATTR.pixelRatioSrcRegex) || attr.name.match(ATTR.viewboxRegex) || attr.name.match(ATTR.pixelRatioOnlyRegex)) {

                svg.setAttribute(attr.name, attr.value);
            }
        });
    };

    ResponsiveSVGPicture.prototype._clearNoscript = function (SVGPictureData) {

        SVGPictureData.element.insertAdjacentHTML("afterend", SVGPictureData.element.textContent || SVGPictureData.element.innerHTML);

        var svg = SVGPictureData.element.nextElementSibling;

        this._copyAttrsFromNoscriptToSVG(SVGPictureData, svg);

        svg.setAttribute("overflow", "hidden");

        SVGPictureData.element.parentNode.removeChild(SVGPictureData.element);

        this.SVGPictures = this.SVGPictures.map(function (noscript) {
            return noscript === SVGPictureData.element ? svg: noscript;
        });

        return svg;
    };

    ResponsiveSVGPicture.prototype._prepareSVGPictureData = function (SVGPicture) {

        var useDataIndex = null,

            usesMQ = this._usesMQ(SVGPicture);

        if (usesMQ) {

            useDataIndex = this._findDataIndex(SVGPicture);
        }

        var SVGPictureData = this._findSVGPictureData(SVGPicture, useDataIndex);

        SVGPictureData.element = SVGPicture;
        SVGPictureData.dataIndex = useDataIndex;
        SVGPictureData.usesMQ = usesMQ;

        return SVGPictureData;
    };

    ResponsiveSVGPicture.prototype._useImageFromPictureData = function (SVGPictureData) {

        var svg = SVGPictureData.element;

        if (SVGPictureData.element.tagName.toLowerCase() === "noscript") {

            svg = this._clearNoscript(SVGPictureData);
        }

        var imageEl = svg.querySelector("image");

        if (SVGPictureData.imageHref) {

            imageEl.setAttribute("x", "0");
            imageEl.setAttribute("y", "0");
            imageEl.setAttribute("width", "100%");
            imageEl.setAttribute("height", "100%");
            imageEl.setAttribute("xlink:href", SVGPictureData.imageHref);

            if (SVGPictureData.viewbox) {

                svg.setAttribute("viewBox", SVGPictureData.viewbox);
            }
        }

        if ((SVGPictureData.usesMQ && !SVGPictureData.viewbox) || (!SVGPictureData.usesMQ && !svg.hasAttribute("viewBox"))) {

            this._setViewboxOnLoad(svg, imageEl, SVGPictureData.dataIndex);
        }
    };

    ResponsiveSVGPicture.prototype._loadImages = function () {

        this.SVGPictures.forEach(function (SVGPicture) {

            this._loadImagesTimeouts.push(setTimeout(function () {

                var SVGPictureData = this._prepareSVGPictureData(SVGPicture);

                this._loadImagesTimeouts.push(setTimeout(this._useImageFromPictureData.bind(this, SVGPictureData), 0));

            }.bind(this), 0));

        }, this);
    };

    ResponsiveSVGPicture.prototype._setViewboxOnLoad = function (svg, imageEl, dataIndex) {

        var tempImg = new Image(),

            loadHref = imageEl.getAttribute("xlink:href"),

            checkDimensionsInterval,

            onload = function (event) {

                if ((event && event.type === "load") || tempImg.naturalWidth || tempImg.naturalHeight) {

                    clearInterval(checkDimensionsInterval);

                    imageEl.removeEventListener("load", onload);

                    if (loadHref === imageEl.getAttribute("xlink:href")) {

                        var viewbox = "0 0 " + tempImg.naturalWidth + " " + tempImg.naturalHeight;

                        svg.setAttribute("viewBox", viewbox);

                        if (typeof dataIndex === "number") {

                            svg.setAttribute(ATTR.viewbox(dataIndex), viewbox);
                        }
                    }
                }
            };

        checkDimensionsInterval = setInterval(onload, ResponsiveSVGPicture.VIEWBOX_INTERVAL);

        imageEl.addEventListener("load", onload);

        tempImg.src = loadHref;
    };

    /* Zpracuje zadaný element (pokud ještě není).
     */
    ResponsiveSVGPicture.prototype.add = function (SVGPicture) {

        if (!this.SVGPictures.some(function (_SVGPicture) { return _SVGPicture === SVGPicture;})) {

            var svgPictureData = this._prepareSVGPictureData(SVGPicture);

            this._loadImagesTimeouts = this._loadImagesTimeouts || [];

            this._loadImagesTimeouts.push(setTimeout(this._useImageFromPictureData.bind(this, svgPictureData), 0));
        }
    };

    /* Obnoví všechny SVGPictures.
     */
    ResponsiveSVGPicture.prototype.refresh = function () {

        this.SVGPictures = Array.prototype.slice.call(document.querySelectorAll(SELECTOR.svgPicture));

        this.devicePixelRatio = Math.ceil(window.devicePixelRatio || 1);

        if (!this.SVGPictures.length) {

            return;
        }

        if (this._loadImagesTimeouts) {

            this._loadImagesTimeouts.forEach(function (timeout) {
                clearTimeout(timeout);
            });
        }

        this._loadImagesTimeouts = [];

        this._loadImages();
    };


    document.addEventListener("DOMContentLoaded", function () {

        if (ResponsiveSVGPicture.AUTOLOAD) {

            window.SVGPicture = new ResponsiveSVGPicture();
        }
    });
}());
