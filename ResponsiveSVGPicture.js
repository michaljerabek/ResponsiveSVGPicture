/*jslint indent: 4, white: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
(function() {

    var SELECTOR = {
        RSVGPicture: ".rsvg-picture"
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

    //Inicializovat automaticky (false = manuálně new ResponsiveSVGPicture());
    ResponsiveSVGPicture.AUTOINIT = true;

    //Timeout události resize
    ResponsiveSVGPicture.RESIZE_TIMEOUT = 100;

    //Timeout intervalu testující, jestli jsou k dispozici informace o velikosti obrázku
    ResponsiveSVGPicture.VIEWBOX_INTERVAL = 30;


    ResponsiveSVGPicture.prototype._findDataIndex = function (RSVGPicture) {

        var useDataIndex = 1;

        Array.prototype.forEach.call(RSVGPicture.attributes, function (attr) {

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

    ResponsiveSVGPicture.prototype._usesMQ = function (RSVGPicture) {

        return Array.prototype.some.call(RSVGPicture.attributes, function (attr) {
            return attr.name.match(ATTR.mqRegex);
        });
    };

    ResponsiveSVGPicture.prototype._findRSVGPictureData = function (RSVGPicture, dataIndex) {

        var highestSrcPixelRatio = 1,

            imageHref = "",

            usesMQ = typeof dataIndex === "number";

        Array.prototype.some.call(RSVGPicture.attributes, function (attr) {

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

            var srcAttr = usesMQ ? RSVGPicture.attributes[ATTR.pixelRatioSrc(dataIndex || 1, highestSrcPixelRatio)] : RSVGPicture.attributes[ATTR.pixelRatioOnly(highestSrcPixelRatio)];

            if (srcAttr) {

                imageHref = srcAttr.value;
            }
        }

        return {
            imageHref: imageHref,
            viewbox: usesMQ ? RSVGPicture.getAttribute(ATTR.viewbox(dataIndex)) || null : null
        };
    };

    ResponsiveSVGPicture.prototype._copyAttrsFromNoscriptToSVG = function (RSVGPictureData, svg) {

        Array.prototype.forEach.call(RSVGPictureData.element.attributes, function (attr) {

            if (attr.name === "class") {

                svg.setAttribute(attr.name, (svg.getAttribute("class") || "") + " " + attr.value);

                return;
            }

            if (attr.name.match(ATTR.mqRegex) || attr.name.match(ATTR.pixelRatioSrcRegex) || attr.name.match(ATTR.viewboxRegex) || attr.name.match(ATTR.pixelRatioOnlyRegex)) {

                svg.setAttribute(attr.name, attr.value);
            }
        });
    };

    ResponsiveSVGPicture.prototype._clearNoscript = function (RSVGPictureData) {

        RSVGPictureData.element.insertAdjacentHTML("afterend", RSVGPictureData.element.textContent || RSVGPictureData.element.innerHTML);

        var svg = RSVGPictureData.element.nextElementSibling;

        this._copyAttrsFromNoscriptToSVG(RSVGPictureData, svg);

        svg.setAttribute("overflow", "hidden");

        RSVGPictureData.element.parentNode.removeChild(RSVGPictureData.element);

        this.RSVGPictures = this.RSVGPictures.map(function (noscript) {
            return noscript === RSVGPictureData.element ? svg: noscript;
        });

        return svg;
    };

    ResponsiveSVGPicture.prototype._prepareRSVGPictureData = function (RSVGPicture) {

        var useDataIndex = null,

            usesMQ = this._usesMQ(RSVGPicture);

        if (usesMQ) {

            useDataIndex = this._findDataIndex(RSVGPicture);
        }

        var RSVGPictureData = this._findRSVGPictureData(RSVGPicture, useDataIndex);

        RSVGPictureData.element = RSVGPicture;
        RSVGPictureData.dataIndex = useDataIndex;
        RSVGPictureData.usesMQ = usesMQ;

        return RSVGPictureData;
    };

    ResponsiveSVGPicture.prototype._useImageFromRSVGPictureData = function (RSVGPictureData) {

        var svg = RSVGPictureData.element;

        if (RSVGPictureData.element.tagName.toLowerCase() === "noscript") {

            svg = this._clearNoscript(RSVGPictureData);
        }

        var imageEl = svg.querySelector("image");

        if (RSVGPictureData.imageHref) {

            imageEl.setAttribute("x", "0");
            imageEl.setAttribute("y", "0");
            imageEl.setAttribute("width", "100%");
            imageEl.setAttribute("height", "100%");
            imageEl.setAttribute("xlink:href", RSVGPictureData.imageHref);

            if (RSVGPictureData.viewbox) {

                svg.setAttribute("viewBox", RSVGPictureData.viewbox);
            }
        }

        if ((RSVGPictureData.usesMQ && !RSVGPictureData.viewbox) || (!RSVGPictureData.usesMQ && !svg.hasAttribute("viewBox"))) {

            this._setViewboxOnLoad(svg, imageEl, RSVGPictureData.dataIndex);
        }
    };

    ResponsiveSVGPicture.prototype._loadImages = function () {

        this.RSVGPictures.forEach(function (RSVGPicture) {

            this._loadImagesTimeouts.push(setTimeout(function () {

                var RSVGPictureData = this._prepareRSVGPictureData(RSVGPicture);

                this._loadImagesTimeouts.push(setTimeout(this._useImageFromRSVGPictureData.bind(this, RSVGPictureData), 0));

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
    ResponsiveSVGPicture.prototype.add = function (RSVGPicture) {

        if (!this.RSVGPictures.some(function (_RSVGPicture) { return _RSVGPicture === RSVGPicture;})) {

            var RSVGPictureData = this._prepareRSVGPictureData(RSVGPicture);

            this._loadImagesTimeouts = this._loadImagesTimeouts || [];

            this._loadImagesTimeouts.push(setTimeout(this._useImageFromRSVGPictureData.bind(this, RSVGPictureData), 0));
        }
    };

    /* Obnoví všechny RSVGPictures.
     */
    ResponsiveSVGPicture.prototype.refresh = function () {

        this.RSVGPictures = Array.prototype.slice.call(document.querySelectorAll(SELECTOR.RSVGPicture));

        this.devicePixelRatio = Math.ceil(window.devicePixelRatio || 1);

        if (!this.RSVGPictures.length) {

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

        if (ResponsiveSVGPicture.AUTOINIT) {

            window.RSVGPicture = new ResponsiveSVGPicture();
        }
    });
}());
