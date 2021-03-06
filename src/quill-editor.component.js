import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, Renderer2, ViewEncapsulation } from '@angular/core';
import { NG_VALUE_ACCESSOR, NG_VALIDATORS } from '@angular/forms';
import { Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import * as QuillNamespace from 'quill';
var Quill = QuillNamespace;
var QuillEditorComponent = (function () {
    function QuillEditorComponent(elementRef, doc, renderer) {
        this.elementRef = elementRef;
        this.doc = doc;
        this.renderer = renderer;
        this.emptyArray = [];
        this.defaultModules = {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                // toggled buttons
                ['blockquote', 'code-block'],
                [{ 'header': 1 }, { 'header': 2 }],
                // custom button values
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                // superscript/subscript
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                // outdent/indent
                [{ 'direction': 'rtl' }],
                // text direction
                [{ 'size': ['small', false, 'large', 'huge'] }],
                // custom dropdown
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'color': this.emptyArray.slice() }, { 'background': this.emptyArray.slice() }],
                // dropdown with defaults from theme
                [{ 'font': this.emptyArray.slice() }],
                [{ 'align': this.emptyArray.slice() }],
                ['clean'],
                // remove formatting button
                ['link', 'image', 'video'] // link and image, video
            ]
        };
        this.style = {};
        this.strict = true;
        this.customOptions = [];
        this.onEditorCreated = new EventEmitter();
        this.onContentChanged = new EventEmitter();
        this.onSelectionChanged = new EventEmitter();
        this.rawQuillEditor = this.quillEditor;
        this.rootElement = this.elementRef.nativeElement;
        this.onModelChange = function () { };
        this.onModelTouched = function () { };
    }
    QuillEditorComponent.prototype.ngAfterViewInit = function () {
        var _this = this;
        var toolbarElem = this.elementRef.nativeElement.querySelector('[quill-editor-toolbar]');
        var modules = this.modules || this.defaultModules;
        var placeholder = 'Insert text here ...';
        if (this.placeholder !== null && this.placeholder !== undefined) {
            placeholder = this.placeholder.trim();
        }
        if (toolbarElem) {
            modules['toolbar'] = toolbarElem;
        }
        this.elementRef.nativeElement.insertAdjacentHTML('beforeend', '<div quill-editor-element></div>');
        this.editorElem = this.elementRef.nativeElement.querySelector('[quill-editor-element]');
        if (this.style) {
            Object.keys(this.style).forEach(function (key) {
                _this.renderer.setStyle(_this.editorElem, key, _this.style[key]);
            });
        }
        this.customOptions.forEach(function (customOption) {
            var newCustomOption = Quill.import(customOption.import);
            newCustomOption.whitelist = customOption.whitelist;
            Quill.register(newCustomOption, true);
        });
        this.quillEditor = new Quill(this.editorElem, {
            modules: modules,
            placeholder: placeholder,
            readOnly: this.readOnly || false,
            theme: this.theme || 'snow',
            formats: this.formats,
            bounds: this.bounds || this.doc.body,
            strict: this.strict,
            scrollingContainer: this.scrollingContainer
        });
        this.rawQuillEditor = this.quillEditor;
        if (this.content) {
            var contents = this.quillEditor.clipboard.convert(this.content);
            this.quillEditor.setContents(contents);
            this.quillEditor.history.clear();
        }
        this.onEditorCreated.emit(this.quillEditor);
        // mark model as touched if editor lost focus
        this.quillEditor.on('selection-change', function (range, oldRange, source) {
            _this.onSelectionChanged.emit({
                editor: _this.quillEditor,
                range: range,
                oldRange: oldRange,
                source: source
            });
            if (!range) {
                _this.onModelTouched();
            }
        });
        // update model if text changes
        this.quillEditor.on('text-change', function (delta, oldDelta, source) {
            var html = _this.editorElem.children[0].innerHTML;
            var text = _this.quillEditor.getText();
            if (html === '<p><br></p>') {
                html = null;
            }
            _this.onModelChange(html);
            _this.onContentChanged.emit({
                editor: _this.quillEditor,
                html: html,
                text: text,
                delta: delta,
                oldDelta: oldDelta,
                source: source
            });
        });
    };
    QuillEditorComponent.prototype.ngOnChanges = function (changes) {
        if (changes['readOnly'] && this.quillEditor) {
            this.quillEditor.enable(!changes['readOnly'].currentValue);
        }
    };
    QuillEditorComponent.prototype.writeValue = function (currentValue) {
        this.content = currentValue;
        if (this.quillEditor) {
            if (currentValue) {
                this.quillEditor.setContents(this.quillEditor.clipboard.convert(this.content));
                return;
            }
            this.quillEditor.setText('');
        }
    };
    QuillEditorComponent.prototype.registerOnChange = function (fn) {
        this.onModelChange = fn;
    };
    QuillEditorComponent.prototype.registerOnTouched = function (fn) {
        this.onModelTouched = fn;
    };
    QuillEditorComponent.prototype.validate = function () {
        if (!this.quillEditor) {
            return null;
        }
        var err = {}, valid = true;
        var textLength = this.quillEditor.getText().trim().length;
        if (this.minLength && textLength && textLength < this.minLength) {
            err.minLengthError = {
                given: textLength,
                minLength: this.minLength
            };
            valid = false;
        }
        if (this.maxLength && textLength > this.maxLength) {
            err.maxLengthError = {
                given: textLength,
                maxLength: this.maxLength
            };
            valid = false;
        }
        if (this.required && !textLength) {
            err.requiredError = {
                empty: true
            };
            valid = false;
        }
        return valid ? null : err;
    };
    QuillEditorComponent.decorators = [
        { type: Component, args: [{
                    selector: 'quill-editor',
                    template: "\n  <ng-content select=\"[quill-editor-toolbar]\"></ng-content>\n",
                    providers: [{
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef(function () { return QuillEditorComponent; }),
                            multi: true
                        }, {
                            provide: NG_VALIDATORS,
                            useExisting: forwardRef(function () { return QuillEditorComponent; }),
                            multi: true
                        }],
                    encapsulation: ViewEncapsulation.None
                },] },
    ];
    /** @nocollapse */
    QuillEditorComponent.ctorParameters = function () { return [
        { type: ElementRef, },
        { type: undefined, decorators: [{ type: Inject, args: [DOCUMENT,] },] },
        { type: Renderer2, },
    ]; };
    QuillEditorComponent.propDecorators = {
        "theme": [{ type: Input },],
        "modules": [{ type: Input },],
        "readOnly": [{ type: Input },],
        "placeholder": [{ type: Input },],
        "maxLength": [{ type: Input },],
        "minLength": [{ type: Input },],
        "required": [{ type: Input },],
        "formats": [{ type: Input },],
        "style": [{ type: Input },],
        "strict": [{ type: Input },],
        "scrollingContainer": [{ type: Input },],
        "bounds": [{ type: Input },],
        "customOptions": [{ type: Input },],
        "onEditorCreated": [{ type: Output },],
        "onContentChanged": [{ type: Output },],
        "onSelectionChanged": [{ type: Output },],
        "rawQuillEditor": [{ type: Output },],
        "rootElement": [{ type: Output },],
    };
    return QuillEditorComponent;
}());
export { QuillEditorComponent };
//# sourceMappingURL=quill-editor.component.js.map
