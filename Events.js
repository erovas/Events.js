/*
 * Events.js v1.0.0
 * Pequeña libreria para delegación de eventos
 * Copyright (c) 2021, Emanuel Rojas Vásquez
 * BSD 3-Clause License
 * [Back-compatibility IE11+]
 * https://github.com/erovas/Events.js
 */
Object.defineProperty(window, 'Events', {
    value: ( function(document, window) {

        //Polyfill de "closest"

        if (!Element.prototype.closest) {

            if (!Element.prototype.matches)
                Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

            Object.defineProperty(Element.prototype, 'closest', {
                configurable: true,
                enumerable: true,
                writable: true,
                value: function(selector) {
                    let that = this;

                    do {
                        if (that.matches(selector)) 
                            return that;
                        
                        that = that.parentElement || that.parentNode;
                    } 
                    while (that !== null && that.nodeType === 1);
                
                    return null;
                },
            });
        }

        const collection = {
            click: {},
            input: {},

            touchstart: {},
            touchmove: {},
            touchend: {},

            mousedown: {},
            mousemove: {},
            mouseup: {},

            keydown: {},
            keyup: {},

            /*resize: {},
            ready: [],
            load: [] */
        }

        const addEvent = function(event, eventName, selector, callback) {

            if(!selector || !callback || typeof callback !== 'function')
                return null;

            //"selector" NO es valido para los siguiente casos
            if (['*', 'window', 'document', 'document.documentElement', window, document, document.documentElement].indexOf(selector) > -1) 
                return null;

            //si "selector" es un HTMLElement o se convierte en un string
            const element = selector instanceof Element? selector: selector+'';

            if(Object.keys(event).length === 0){
                document.addEventListener(eventName, function(e){
                    
                    const target = e.target;

                    for (let key in event){
                        const selector = event[key].selector;
                        
                        // objeto/valor original del parametro "selector"
                        e.Selector = event[key].origin;
                        
                        if(typeof selector === 'string') {
                            let tagTarget = target.closest(selector);
                            e.tagTarget = tagTarget;
                            
                            if(tagTarget)
                                event[key].callback(e, tagTarget);
                            else if(target.shadowRoot){  //ShadowRoot 'open'
                                const path = e.path || e.composedPath();
                                const index = path.indexOf(target);
                                for (let i = 0; i < index - 1; i++) {
                                    tagTarget = path[i].closest(selector);
                                    if(tagTarget){
                                        e.tagTarget = tagTarget;
                                        e.customElement = target;
                                        event[key].callback(e, tagTarget);
                                    }
                                }
                            }
                            continue;
                        }

                        //El elemento que tiene el evento
                        e.tagTarget = selector;

                        if(selector === target || selector.contains(target))
                            event[key].callback(e, selector);
                        else if(target.shadowRoot){  //ShadowRoot 'open'
                            const path = e.path || e.composedPath();
                            const index = path.indexOf(target);
                            for (let i = 0; i < index - 1; i++){
                                if(selector === path[i]){
                                    e.customElement = target;
                                    event[key].callback(e, selector);
                                }
                            }
                        }
                    }
                }, { passive: false });
                //}, false);
            }

            const index = Object.keys(event).length;
            event[index] = {
                selector: element,
                origin: selector,
                callback: callback
            }
            
            return {
                callback: callback,
                index: index
            }
        }

        const removeEvent = function(index, event) {
            if(event[index]){
                delete event[index];
                return true;
            }
            return false;
        }

        //Para el caso especial del evento "input"
        const isIE = /*@cc_on!@*/false || !!document.documentMode;

        const output = {};

        //Adders and Removers
        for (let eve in collection) {
            const event = eve;   //fix issues scope variable on ie11
            if(event === 'input'){
                output[event] = function(selector, callback){
                    return addEvent(collection[event], isIE? 'textinput': event, selector, callback);
                }
            }
            else {
                output[event] = function(selector, callback){
                    return addEvent(collection[event], event, selector, callback);
                }
            }

            output['remove' + event.charAt(0).toUpperCase() + event.slice(1)] = function(index){
                return removeEvent(index, collection[event]);
            }
        }

        collection.resize = {};
        collection.ready = [];
        collection.load = [];

        // window.onresize
        output.resize = function(callback) {
            if(typeof callback !== 'function')
                return null;
            
            if(Object.keys(collection.resize).length === 0){
                window.addEventListener('resize', function(e){
                    for (let key in collection.resize)
                        collection.resize[key](e, this);
                }, false);
            }

            const index = Object.keys(collection.resize).length;
            collection.resize[index] = callback;
            
            return {
                callback: callback,
                index: index
            }
        }

        output.removeResize = function(index) {
            return removeEvent(index, collection.resize);
        }

        // DOM ready
        output.ready = function(callback) {

            if(typeof callback !== 'function')
                return null;

            if(document.readyState === 'interactive' || document.readyState === 'complete'){
                callback(document);
                return callback;
            }

            if(collection.ready.length === 0 && document.readyState !== 'complete'){
                document.addEventListener('DOMContentLoaded', function(e) {
                    for (let i = 0; i < collection.ready.length; i++)
                        collection.ready[i](this);
                    
                    delete collection.ready;
                }, { once: true });
            }

            collection.ready.push(callback);
            return callback;
        }

        // window ready
        output.load = function(callback) {

            if(typeof callback !== 'function')
                return null;

            if(document.readyState === 'interactive' || document.readyState === 'complete'){
                callback(window);
                return callback;
            }

            if(collection.load.length === 0){
                window.addEventListener('load', function(e) {
                    for (let i = 0; i < collection.load.length; i++)
                        collection.load[i](this);
                    
                    delete collection.load;
                }, { once: true });
            }

            collection.load.push(callback);
            return callback;
        }

        return output;

    })(document, window),
    writable: false
});