/*
 * Copyright (C) 2017-2020 HERE Europe B.V.
 * Licensed under Apache 2.0, see full license in LICENSE
 * SPDX-License-Identifier: Apache-2.0
 */
import { getTestResourceUrl } from "@here/harp-test-utils";
import { assert } from "chai";

import { ImageItem } from "../lib/image/Image";
import { ImageCache } from "../lib/image/ImageCache";
import { MapViewImageCache } from "../lib/image/MapViewImageCache";
import { MapView } from "../lib/MapView";

//    Mocha discourages using arrow functions, see https://mochajs.org/#arrow-functions

class ImageData {
    constructor(public width: number, public height: number) {}
    close() {
        /* mock only */
    }
}

describe("MapViewImageCache", function() {
    const mapView: MapView = {} as MapView;

    beforeEach(function() {
        ImageCache.instance.clearAll();
    });

    it("#empty", function() {
        const cache = new MapViewImageCache(mapView);
        assert.equal(cache.numberOfNames, 0);
        assert.equal(cache.numberOfUrls, 0);
        assert.notExists(cache.findNames("xxx"));
    });

    it("#registerImage", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData = new ImageData(16, 16);

        cache.registerImage("testImage", "httpx://naxos.de", imageData);

        const testImage1 = cache.findImageByName("testImage");
        const testImage2 = cache.findImageByUrl("httpx://naxos.de");

        assert.equal(cache.numberOfNames, 1);
        assert.equal(cache.numberOfUrls, 1);
        assert.notExists(cache.findImageByName("xxx"));
        assert.notExists(cache.findImageByUrl("xxx"));
        assert.exists(testImage1);
        assert.equal(imageData, testImage1!.imageData);
        assert.exists(testImage2);
        assert.equal(imageData, testImage2!.imageData);
    });

    it("#addImage", function() {
        const cache = new MapViewImageCache(mapView);
        cache.clear();

        const imageName = "headshot.png";
        const imageUrl = getTestResourceUrl("@here/harp-mapview", "test/resources/headshot.png");

        const imageItem = cache.addImage(imageName, imageUrl, false);
        assert.isDefined(imageItem);
        assert.isFalse(imageItem instanceof Promise);

        const testImage = cache.findImageByName(imageName);
        assert.exists(testImage);
        assert.isUndefined(testImage!.imageData);
        assert.isFalse(testImage!.loaded);
    });

    if (typeof document !== "undefined") {
        it("#addImage with load", async function() {
            const cache = new MapViewImageCache(mapView);
            cache.clear();

            const imageName = "headshot.png";
            const imageUrl = getTestResourceUrl(
                "@here/harp-mapview",
                "test/resources/headshot.png"
            );

            const promise = cache.addImage(imageName, imageUrl, true);

            const testImage = cache.findImageByName(imageName);
            assert.exists(testImage);
            assert.isUndefined(testImage!.imageData);
            assert.isFalse(testImage!.loaded);

            assert.isTrue(promise instanceof Promise);

            if (promise instanceof Promise) {
                await promise;
                const loadedImageItem = cache.findImageByName(imageName);
                assert.exists(loadedImageItem);
                assert.isDefined(loadedImageItem!.imageData);
                assert.isTrue(loadedImageItem!.loaded);
                const image = loadedImageItem!.imageData!;
                assert.equal(image.width, 37);
                assert.equal(image.height, 32);
            }
        });

        it("#addImage (load cancelled)", async function() {
            const cache = new MapViewImageCache(mapView);
            cache.clear();

            const imageName = "headshot.png";
            const imageUrl = getTestResourceUrl(
                "@here/harp-mapview",
                "test/resources/headshot.png"
            );

            const promise = cache.addImage(imageName, imageUrl, true);

            const testImage = cache.findImageByName(imageName);
            assert.exists(testImage);
            assert.isUndefined(testImage!.imageData);
            assert.isFalse(testImage!.loaded);

            assert.isTrue(promise instanceof Promise);

            // removal leads to cancel
            assert.isTrue(cache.removeImage(imageName), "remove failed");

            if (promise instanceof Promise) {
                const imageItem = cache.findImageByName(imageName);
                assert.notExists(imageItem, "image is still in cache");
                assert.isTrue(testImage!.cancelled);
                // result of promise ignored, it depends on timing of load and image generation:
                await promise;
                // only assured that cancelled is set to `true`, loaded may also be set to true if
                // cancelled after/during image generation.
                assert.isTrue(testImage!.cancelled);
            }
        });

        it("#loadImage", async function() {
            const cache = new MapViewImageCache(mapView);
            cache.clear();

            const imageName = "headshot.png";
            const imageUrl = getTestResourceUrl(
                "@here/harp-mapview",
                "test/resources/headshot.png"
            );

            const imageItem: ImageItem = cache.addImage(imageName, imageUrl, false) as ImageItem;
            assert.isDefined(imageItem);
            assert.isFalse(imageItem instanceof Promise);

            assert.isUndefined(imageItem.imageData);
            assert.isFalse(imageItem!.loaded);

            const promise = cache.loadImage(imageItem);
            assert.isTrue(promise instanceof Promise);

            if (promise instanceof Promise) {
                await promise;
                const loadedImageItem = cache.findImageByName(imageName);
                assert.exists(loadedImageItem);
                assert.isDefined(loadedImageItem!.imageData);
                assert.isTrue(loadedImageItem!.loaded);
                const image = loadedImageItem!.imageData!;
                assert.equal(image.width, 37);
                assert.equal(image.height, 32);
            }
        });
    }

    it("#clear", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData = new ImageData(16, 16);

        cache.registerImage("testImage", "httpx://naxos.de", imageData);
        cache.registerImage("testImage2", "httpx://naxos.de", imageData);
        assert.equal(cache.numberOfNames, 2);
        assert.equal(cache.numberOfUrls, 1);

        const numImagesRemoved = cache.clear();

        assert.equal(ImageCache.instance.size, 0, "wrong cache size");
        assert.equal(cache.numberOfNames, 0, "wrong number of names");
        assert.equal(cache.numberOfUrls, 0, "wrong number of urls");
        assert.equal(numImagesRemoved, 1, "wrong number of removed images");
    });

    it("#add images", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de-2", imageData2);

        const testImage1 = cache.findImageByName("testImage1");
        const testImage2 = cache.findImageByName("testImage2");

        const testImage11 = cache.findImageByUrl("httpx://naxos.de");
        const testImage22 = cache.findImageByUrl("httpx://naxos.de-2");

        assert.equal(cache.numberOfNames, 2);
        assert.equal(cache.numberOfUrls, 2);
        assert.exists(testImage1);
        assert.equal(imageData1, testImage1!.imageData);
        assert.equal(imageData1, testImage11!.imageData);
        assert.exists(testImage2);
        assert.equal(imageData2, testImage2!.imageData);
        assert.equal(imageData2, testImage22!.imageData);

        assert.isTrue(cache.hasName("testImage1"));
        assert.isTrue(cache.hasName("testImage2"));
        assert.isTrue(cache.hasUrl("httpx://naxos.de"));
        assert.isTrue(cache.hasUrl("httpx://naxos.de-2"));
    });

    it("#add images with same url but differing names", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de", imageData2);

        const testImage1 = cache.findImageByName("testImage1");
        const testImage2 = cache.findImageByName("testImage2");

        const testImage11 = cache.findImageByUrl("httpx://naxos.de");

        assert.equal(cache.numberOfNames, 2, "should have 2 names");
        assert.equal(cache.numberOfUrls, 1, "should have just 1 url");
        assert.exists(testImage1);
        assert.deepEqual(imageData1, testImage1!.imageData);
        assert.deepEqual(imageData1, testImage11!.imageData);
        assert.exists(testImage2);
        assert.deepEqual(imageData1, testImage2!.imageData);

        assert.deepEqual(cache.findNames("httpx://naxos.de"), ["testImage1", "testImage2"]);
    });

    it("#add images with same name but differing urls", function() {
        const cache = new MapViewImageCache(mapView);
        assert.throws(() => {
            cache.registerImage("testImage", "httpx://naxos.de", undefined);
            cache.registerImage("testImage", "httpx://naxos.de-2", undefined);
        });
    });

    it("#remove image", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);

        assert.exists(cache.findImageByName("testImage1"));

        assert.equal(ImageCache.instance.size, 1);
        assert.equal(cache.numberOfNames, 1, "wrong number of names");
        assert.equal(cache.numberOfUrls, 1, "wrong number of urls");

        const imageRemoved = cache.removeImage("testImage1");
        assert.equal(imageRemoved, true);
        assert.equal(cache.numberOfNames, 0, "wrong number of names");
        assert.equal(cache.numberOfUrls, 0, "wrong number of urls");
    });

    it("#remove image 2", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de", imageData1);

        assert.exists(cache.findImageByName("testImage1"));
        assert.exists(cache.findImageByName("testImage2"));

        assert.equal(ImageCache.instance.size, 1, "wrong cache size");
        assert.equal(cache.numberOfNames, 2, "wrong number of names");
        assert.equal(cache.numberOfUrls, 1, "wrong number of urls");

        const imageRemoved = cache.removeImage("testImage2");
        assert.equal(imageRemoved, true);
        assert.equal(ImageCache.instance.size, 1, "wrong cache size");
        assert.equal(cache.numberOfNames, 1, "wrong number of names");
        assert.equal(cache.numberOfUrls, 1, "wrong number of urls");
        assert.exists(cache.findImageByName("testImage1"));
    });

    it("#remove image by URL", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de-2", imageData2);
        assert.equal(ImageCache.instance.size, 2);
        assert.equal(cache.numberOfNames, 2);
        assert.equal(cache.numberOfUrls, 2);

        const imageRemoved = cache.removeImageByUrl("httpx://naxos.de"!);
        assert.equal(imageRemoved, true);
        assert.equal(cache.numberOfNames, 1, "wrong number of names");
        assert.equal(cache.numberOfUrls, 1, "wrong number of urls");

        assert.equal(ImageCache.instance.size, 1);
        const testImage2 = cache.findImageByUrl("httpx://naxos.de-2");
        assert.exists(testImage2);
    });

    it("#remove image by name", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de-2", imageData2);
        assert.equal(ImageCache.instance.size, 2);

        const imageRemoved = cache.removeImage("testImage1");
        assert.equal(imageRemoved, true);
        assert.equal(cache.numberOfNames, 1, "wrong number of names");
        assert.equal(cache.numberOfUrls, 1, "wrong number of urls");

        assert.equal(ImageCache.instance.size, 1);
        const testImage2 = cache.findImageByUrl("httpx://naxos.de-2");
        assert.exists(testImage2);
    });

    it("#remove image by filter", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de-2", imageData2);
        cache.registerImage("testImage3", "httpx://naxos.de-3", imageData2);
        assert.equal(ImageCache.instance.size, 3);

        const imagesRemoved = cache.removeImages((name: string, url: string) => {
            return url === "httpx://naxos.de-2";
        });
        assert.equal(imagesRemoved, 1);
        assert.equal(cache.numberOfNames, 2, "wrong number of names");
        assert.equal(cache.numberOfUrls, 2, "wrong number of urls");

        assert.equal(ImageCache.instance.size, 2);
        assert.exists(cache.findImageByUrl("httpx://naxos.de"));
        assert.exists(cache.findImageByUrl("httpx://naxos.de-3"));
        assert.notExists(cache.findImageByUrl("httpx://naxos.de-2"));
    });

    it("#remove image by filter 2", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de", imageData2);
        cache.registerImage("testImage3", "httpx://naxos.de", imageData2);
        assert.equal(ImageCache.instance.size, 1, "wrong cache size");
        assert.equal(cache.numberOfNames, 3, "wrong number of names");
        assert.equal(cache.numberOfUrls, 1, "wrong number of urls");

        const imagesRemoved = cache.removeImages((name: string, url: string) => {
            return name === "testImage3";
        });

        assert.equal(imagesRemoved, 1, "wrong number of removed images");
        assert.equal(cache.numberOfNames, 2, "wrong number of names");
        assert.equal(cache.numberOfUrls, 1, "wrong number of urls");

        assert.equal(ImageCache.instance.size, 1, "wrong cache size");
        assert.exists(cache.findImageByName("testImage1"));
        assert.exists(cache.findImageByName("testImage2"));
        assert.notExists(cache.findImageByName("testImage3"));
    });

    it("#remove image with name by filter", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de-2", imageData2);
        cache.registerImage("undefined", "httpx://naxos.de-3", imageData2);
        assert.equal(cache.numberOfNames, 3, "wrong number of names");
        assert.equal(ImageCache.instance.size, 3, "wrong cache size");

        const imagesRemoved = cache.removeImages((name: string, url: string) => {
            return url === "httpx://naxos.de-2";
        });
        assert.equal(imagesRemoved, 1);
        assert.equal(cache.numberOfNames, 2, "wrong number of names");
        assert.equal(cache.numberOfUrls, 2, "wrong number of urls");

        assert.equal(ImageCache.instance.size, 2);
        assert.exists(cache.findImageByUrl("httpx://naxos.de"));
        assert.exists(cache.findImageByUrl("httpx://naxos.de-3"));
        assert.notExists(cache.findImageByUrl("httpx://naxos.de-2"));
    });

    it("#remove all images by filter", function() {
        const cache = new MapViewImageCache(mapView);

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage("testImage1", "httpx://naxos.de", imageData1);
        cache.registerImage("testImage2", "httpx://naxos.de-2", imageData2);
        cache.registerImage("testImage3", "httpx://naxos.de-3", imageData2);

        const imagesRemoved = cache.removeImages((name: string, url: string) => {
            return true;
        });
        assert.equal(imagesRemoved, 3);
        assert.equal(cache.numberOfNames, 0, "wrong number of names");
        assert.equal(cache.numberOfUrls, 0);

        assert.equal(ImageCache.instance.size, 0, "cache is not empty");
    });
});

describe("ImageCache", function() {
    beforeEach(function() {
        ImageCache.instance.clearAll();
    });

    it("#instance", function() {
        const cache = ImageCache.instance;
        const instance2 = ImageCache.instance;
        assert.exists(cache);
        assert.equal(cache, instance2);
        cache.clearAll();
    });

    it("#empty", function() {
        const cache = ImageCache.instance;
        assert.equal(cache.size, 0);
        const found = cache.findImage("xxx");
        assert.notExists(found);
    });

    it("#registerImage", function() {
        const mapView: MapView = {} as MapView;
        const cache = ImageCache.instance;
        cache.clearAll();

        const imageData = new ImageData(16, 16);

        cache.registerImage(mapView, "httpx://naxos.de", imageData);

        const testImage = cache.findImage("httpx://naxos.de");

        assert.equal(cache.size, 1);
        assert.notExists(cache.findImage("xxx"));
        assert.exists(testImage);
        assert.equal(imageData, testImage!.imageData);
    });

    if (typeof document !== "undefined") {
        const canvas = document.createElement("canvas");
        canvas.width = 37;
        canvas.height = 32;
        var ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.fillStyle = "#00FF00";
            ctx.fillRect(0, 0, 37, 32);
        }
        const image = document.createElement("img");
        image.src = getTestResourceUrl("@here/harp-mapview", "test/resources/headshot.png");

        it("#addImage, from url", async function() {
            const mapView: MapView = {} as MapView;
            const cache = ImageCache.instance;
            cache.clearAll();

            const imageUrl = getTestResourceUrl(
                "@here/harp-mapview",
                "test/resources/headshot.png"
            );

            const promise = cache.addImage(mapView, imageUrl, true);

            const testImage = cache.findImage(imageUrl);
            assert.exists(testImage);
            assert.isUndefined(testImage!.imageData);
            assert.isFalse(testImage!.loaded);

            assert.isTrue(promise instanceof Promise);

            if (promise instanceof Promise) {
                await promise;
                const loadedImageItem = cache.findImage(imageUrl);
                assert.exists(loadedImageItem);
                assert.isDefined(loadedImageItem!.imageData);
                assert.isTrue(loadedImageItem!.loaded);
                const image = loadedImageItem!.imageData!;
                assert.equal(image.width, 37);
                assert.equal(image.height, 32);
            }
        });

        it("#loadImage, from url", async function() {
            const mapView: MapView = {} as MapView;
            const cache = ImageCache.instance;
            cache.clearAll();

            const imageUrl = getTestResourceUrl(
                "@here/harp-mapview",
                "test/resources/headshot.png"
            );

            const cacheItem = cache.registerImage(mapView, imageUrl, undefined);

            const testImage = cache.findImage(imageUrl);
            assert.exists(testImage);
            assert.isUndefined(testImage!.imageData);
            assert.isFalse(testImage!.loaded);

            const promise = cache.loadImage(cacheItem);

            assert.isTrue(promise instanceof Promise);

            if (promise instanceof Promise) {
                await promise;
                const loadedImageItem = cache.findImage(imageUrl);
                assert.exists(loadedImageItem);
                assert.isDefined(loadedImageItem!.imageData);
                assert.isTrue(loadedImageItem!.loaded);
                const image = loadedImageItem!.imageData!;
                assert.equal(image.width, 37);
                assert.equal(image.height, 32);
            }
        });

        [
            { element: canvas, name: "HtmlCanvasElement" },
            { element: image, name: "HtmlImageElement" }
        ].forEach(testSetting => {
            it("#addImage, from htmlElement " + testSetting.name, async function() {
                const mapView: MapView = {} as MapView;
                const cache = ImageCache.instance;
                cache.clearAll();

                const imageUrl = "htmlElementImage";

                const promise = cache.addImage(mapView, imageUrl, true, testSetting.element);

                const testImage = cache.findImage(imageUrl);
                assert.exists(testImage);
                assert.isUndefined(testImage!.imageData);
                assert.isFalse(testImage!.loaded);

                assert.isTrue(promise instanceof Promise);

                if (promise instanceof Promise) {
                    await promise;
                    const loadedImageItem = cache.findImage(imageUrl);
                    assert.exists(loadedImageItem);
                    assert.isDefined(loadedImageItem!.imageData);
                    assert.isTrue(loadedImageItem!.loaded);
                    const image = loadedImageItem!.imageData!;
                    assert.equal(image.width, 37);
                    assert.equal(image.height, 32);
                }
            });

            it("#loadImage, from htmlElement:  " + testSetting.name, async function() {
                const mapView: MapView = {} as MapView;
                const cache = ImageCache.instance;
                cache.clearAll();

                const imageUrl = "htmlElementImage";

                const cacheItem = cache.registerImage(
                    mapView,
                    imageUrl,
                    undefined,
                    testSetting.element
                );

                const testImage = cache.findImage(imageUrl);
                assert.exists(testImage);
                assert.isUndefined(testImage!.imageData);
                assert.isFalse(testImage!.loaded);

                const promise = cache.loadImage(cacheItem);

                assert.isTrue(promise instanceof Promise);

                if (promise instanceof Promise) {
                    await promise;
                    const loadedImageItem = cache.findImage(imageUrl);
                    assert.exists(loadedImageItem);
                    assert.isDefined(loadedImageItem!.imageData);
                    assert.isTrue(loadedImageItem!.loaded);
                    const image = loadedImageItem!.imageData!;
                    assert.equal(image.width, 37);
                    assert.equal(image.height, 32);
                }
            });

            it(
                "#addImage, from htmlElement and cancel loading: " + testSetting.name,
                async function() {
                    const mapView: MapView = {} as MapView;
                    const cache = ImageCache.instance;
                    cache.clearAll();

                    const imageUrl = "htmlElement";

                    const promise = cache.addImage(mapView, imageUrl, true, testSetting.element);

                    const testImage = cache.findImage(imageUrl);
                    assert.exists(testImage);
                    assert.isUndefined(testImage!.imageData);
                    assert.isFalse(testImage!.loaded);

                    assert.isTrue(promise instanceof Promise);

                    // removal leads to cancel
                    assert.isTrue(cache.removeImage(imageUrl), "remove failed");

                    if (promise instanceof Promise) {
                        const imageItem = cache.findImage(imageUrl);
                        assert.notExists(imageItem, "image is still in cache");
                        assert.isTrue(testImage!.cancelled);
                        // result of promise ignored, it depends on timing of load and image generation:
                        await promise;
                        // only assured that cancelled is set to `true`, loaded may also be set to true if
                        // cancelled after/during image generation.
                        assert.isTrue(testImage!.cancelled);
                    }
                }
            );

            it("#loadImage, from htmlElement: " + testSetting.name, async function() {
                const mapView: MapView = {} as MapView;
                const cache = ImageCache.instance;
                cache.clearAll();

                const imageUrl = "htmlElement";

                const imageItem = cache.addImage(
                    mapView,
                    imageUrl,
                    false,
                    testSetting.element
                ) as ImageItem;
                assert.isDefined(imageItem);
                assert.isFalse(imageItem instanceof Promise);

                assert.isUndefined(imageItem.imageData);
                assert.isFalse(imageItem!.loaded);

                const promise = cache.loadImage(imageItem);
                assert.isTrue(promise instanceof Promise);

                if (promise instanceof Promise) {
                    await promise;
                    const loadedImageItem = cache.findImage(imageUrl);
                    assert.exists(loadedImageItem);
                    assert.isDefined(loadedImageItem!.imageData);
                    assert.isTrue(loadedImageItem!.loaded);
                    const image = loadedImageItem!.imageData!;
                    assert.equal(image.width, 37);
                    assert.equal(image.height, 32);
                }
            });
        });

        it("#loadImage, from  HtmlImageElement with bad src", async function() {
            const mapView: MapView = {} as MapView;
            const cache = ImageCache.instance;
            cache.clearAll();

            const imageUrl = "htmlElement";
            const invalidImage = document.createElement("img");
            invalidImage.src = "fooba.png";

            const imageItem = cache.addImage(mapView, imageUrl, false, invalidImage) as ImageItem;

            assert.isDefined(imageItem);
            assert.isFalse(imageItem instanceof Promise);

            assert.isUndefined(imageItem.imageData);
            assert.isFalse(imageItem!.loaded);

            const promise = cache.loadImage(imageItem);

            assert.isTrue(promise instanceof Promise);

            if (promise instanceof Promise) {
                assert.isRejected(promise);

                const loadedImageItem = cache.findImage(imageUrl);
                assert.exists(loadedImageItem);
                assert.isUndefined(loadedImageItem!.imageData);
                assert.isFalse(loadedImageItem!.loaded);
            }
        });

        it("#loadImage, from HtmlImageElement without src", async function() {
            const mapView: MapView = {} as MapView;
            const cache = ImageCache.instance;
            cache.clearAll();

            const imageUrl = "htmlElement";
            const invalidImage = document.createElement("img");
            invalidImage.src = "fooba.png";

            const imageItem = cache.addImage(mapView, imageUrl, false, invalidImage) as ImageItem;

            assert.isDefined(imageItem);
            assert.isFalse(imageItem instanceof Promise);

            assert.isUndefined(imageItem.imageData);
            assert.isFalse(imageItem!.loaded);

            const promise = cache.loadImage(imageItem);
            assert.isTrue(promise instanceof Promise);

            if (promise instanceof Promise) {
                assert.isRejected(promise);
                const loadedImageItem = cache.findImage(imageUrl);
                assert.exists(loadedImageItem);
                assert.isUndefined(loadedImageItem!.imageData);
                assert.isFalse(loadedImageItem!.loaded);
            }
        });
    }

    it("#clearAll", function() {
        const mapView: MapView = {} as MapView;
        const cache = ImageCache.instance;
        const imageData = new ImageData(16, 16);
        cache.registerImage(mapView, "httpx://naxos.de", imageData);

        cache.clearAll();

        assert.equal(cache.size, 0);
        assert.notExists(cache.findImage("testImage"));
    });

    it("#dispose", function() {
        const mapView: MapView = {} as MapView;
        const imageData = new ImageData(16, 16);
        ImageCache.instance.registerImage(mapView, "httpx://naxos.de", imageData);

        ImageCache.dispose();

        assert.equal(ImageCache.instance.size, 0);
    });

    it("#register same image in multiple MapViews", function() {
        const cache = ImageCache.instance;
        cache.clearAll();

        const mapView1: MapView = {} as MapView;
        const mapView2: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);

        cache.registerImage(mapView1, "httpx://naxos.de", imageData1);
        cache.registerImage(mapView2, "httpx://naxos.de", imageData1);

        const testImage = cache.findImage("httpx://naxos.de");

        assert.equal(cache.size, 1);
        assert.notExists(cache.findImage("xxx"));
        assert.exists(testImage);
        assert.equal(imageData1, testImage!.imageData);
    });

    it("#register different images in multiple MapViews", function() {
        const cache = ImageCache.instance;
        cache.clearAll();

        const mapView1: MapView = {} as MapView;
        const mapView2: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage(mapView1, "httpx://naxos.de", imageData1);
        cache.registerImage(mapView2, "httpx://naxos.de-2", imageData2);

        const testImage1 = cache.findImage("httpx://naxos.de");
        const testImage2 = cache.findImage("httpx://naxos.de-2");

        assert.equal(cache.size, 2);
        assert.notExists(cache.findImage("xxx"));
        assert.exists(testImage1);
        assert.equal(imageData1, testImage1!.imageData);
        assert.exists(testImage2);
        assert.equal(imageData2, testImage2!.imageData);
    });

    it("#clear images in multiple MapViews", function() {
        const cache = ImageCache.instance;
        cache.clearAll();

        const mapView1: MapView = {} as MapView;
        const mapView2: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage(mapView1, "httpx://naxos.de", imageData1);
        cache.registerImage(mapView2, "httpx://naxos.de-2", imageData2);

        cache.clear(mapView1);

        assert.equal(cache.size, 1);

        assert.notExists(cache.findImage("httpx://naxos.de"));
        assert.exists(cache.findImage("httpx://naxos.de-2"));
    });

    it("#remove image item", function() {
        const cache = ImageCache.instance;
        const mapView1: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);

        const item = cache.registerImage(mapView1, "httpx://naxos.de", imageData1);

        assert.equal(cache.size, 1, "wrong cache size");

        const imageRemoved = cache.removeImageItem(item);
        assert.equal(imageRemoved, true);
        assert.equal(cache.size, 0, "wrong cache size");
    });

    it("#remove image", function() {
        const cache = ImageCache.instance;
        const mapView1: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);

        cache.registerImage(mapView1, "httpx://naxos.de", imageData1);

        assert.equal(cache.size, 1, "wrong cache size");

        const imageRemoved = cache.removeImage("httpx://naxos.de");
        assert.equal(imageRemoved, true);
        assert.equal(cache.size, 0, "wrong cache size");
    });

    it("#remove image by filter", function() {
        const cache = ImageCache.instance;
        const mapView1: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage(mapView1, "httpx://naxos.de", imageData1);
        cache.registerImage(mapView1, "httpx://naxos.de-2", imageData2);
        cache.registerImage(mapView1, "httpx://naxos.de-3", imageData2);
        assert.equal(ImageCache.instance.size, 3, "wrong cache size");

        const imagesRemoved = cache.removeImageItems((imageItem: ImageItem) => {
            return imageItem.url === "httpx://naxos.de-2";
        });
        assert.equal(imagesRemoved, 1, "wrong number of images removed");
        assert.equal(cache.size, 2, "wrong cache size");
        assert.exists(cache.findImage("httpx://naxos.de"));
        assert.notExists(cache.findImage("httpx://naxos.de-2"));
        assert.exists(cache.findImage("httpx://naxos.de-3"));
    });

    it("#remove image by filter 2", function() {
        const cache = ImageCache.instance;
        const mapView1: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage(mapView1, "httpx://naxos.de", imageData1);
        cache.registerImage(mapView1, "httpx://naxos.de-2", imageData2);
        cache.registerImage(mapView1, "httpx://XXX", imageData2);
        assert.equal(ImageCache.instance.size, 3, "wrong cache size");

        const imagesRemoved = cache.removeImageItems((imageItem: ImageItem) => {
            return imageItem.url.startsWith("httpx://naxos.de");
        });
        assert.equal(imagesRemoved, 2, "wrong number of images removed");
        assert.equal(cache.size, 1, "wrong cache size");
        assert.exists(cache.findImage("httpx://XXX"));
    });

    it("#remove all images by filter", function() {
        const cache = ImageCache.instance;
        const mapView1: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage(mapView1, "httpx://naxos.de", imageData1);
        cache.registerImage(mapView1, "httpx://naxos.de-2", imageData2);
        cache.registerImage(mapView1, "httpx://naxos.de-3", imageData2);

        const imagesRemoved = cache.removeImageItems((imageItem: ImageItem) => {
            return true;
        });
        assert.equal(imagesRemoved, 3, "wrong number of images removed");
        assert.equal(cache.size, 0, "cache is not empty");
    });

    it("#apply", function() {
        const cache = ImageCache.instance;
        const mapView1: MapView = {} as MapView;

        const imageData1 = new ImageData(16, 16);
        const imageData2 = new ImageData(32, 32);

        cache.registerImage(mapView1, "httpx://naxos.de", imageData1);
        cache.registerImage(mapView1, "httpx://naxos.de-2", imageData2);
        cache.registerImage(mapView1, "httpx://naxos.de-3", imageData2);

        let numImagesInCache = 0;
        cache.apply(imageItem => {
            assert.equal(imageItem.url.split("-")[0], "httpx://naxos.de");
            numImagesInCache++;
        });

        assert.equal(numImagesInCache, 3, "wrong count");
        assert.equal(cache.size, 3, "wrong cache size");
    });
});
