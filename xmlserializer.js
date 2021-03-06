(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.xmlserializer = factory();
    }
}(this, function () {

    // Void elements must be self-closing according to https://www.w3.org/TR/html/syntax.html#void-elements
    var voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr',
        'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr'];

    var isElementVoid = function (elementName) {
        return voidElements.indexOf(elementName.toLowerCase()) !== -1;
    };

    var removeInvalidCharacters = function (content) {
        // See http://www.w3.org/TR/xml/#NT-Char for valid XML 1.0 characters
        return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    };

    var serializeAttributeValue = function (value) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    var serializeTextContent = function (content) {
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    var serializeAttribute = function (attr) {
        var value = attr.value;

        return ' ' + attr.name + '="' + serializeAttributeValue(value) + '"';
    };

    var getTagName = function (node) {
        var tagName = node.tagName;

        // Aid in serializing of original HTML documents
        if (node.namespaceURI === 'http://www.w3.org/1999/xhtml') {
            tagName = tagName.toLowerCase();
        }
        return tagName;
    };

    var serializeNamespace = function (node, isRootNode) {
        var nodeHasXmlnsAttr = Array.prototype.map.call(node.attributes || node.attrs, function (attr) {
            return attr.name;
        })
                .indexOf('xmlns') >= 0;
        // Serialize the namespace as an xmlns attribute whenever the element
        // doesn't already have one and the inherited namespace does not match
        // the element's namespace.
        if (!nodeHasXmlnsAttr &&
            (isRootNode ||
             node.namespaceURI !== node.parentNode.namespaceURI)) {
            return ' xmlns="' + node.namespaceURI + '"';
        } else {
            return '';
        }
    };

    var serializeChildren = function (node, options) {
        return Array.prototype.map.call(node.childNodes, function (childNode) {
            return nodeTreeToXHTML(childNode, options);
        }).join('');
    };

    var serializeTag = function (node, options, isRootNode) {
        var tagName = getTagName(node);
        var output = '<' + tagName;
        output += serializeNamespace(node, isRootNode);

        Array.prototype.forEach.call(node.attributes || node.attrs, function (attr) {
            output += serializeAttribute(attr);
        });

        if (node.childNodes.length > 0) {
            output += '>';
            output += serializeChildren(node, options);
            output += '</' + tagName + '>';
        } else {
            if (options.useSelfClosingTags && isElementVoid(tagName)) {
                output += (options.addSpaceBeforeEndOfSelfClosingTag ? ' ' : '') + '/>';
            } else {
                output += '></' + tagName + '>';
            }
        }
        return output;
    };

    var serializeText = function (node) {
        var text = node.nodeValue || node.value || '';
        return serializeTextContent(text);
    };

    var serializeComment = function (node) {
        return '<!--' +
            node.data
            .replace(/-/g, '&#45;') +
            '-->';
    };

    var serializeCDATA = function (node) {
        return '<![CDATA[' + node.nodeValue + ']]>';
    };

    var nodeTreeToXHTML = function (node, options, isRootNode) {
        if (node.nodeName === '#document' ||
            node.nodeName === '#document-fragment') {
            return serializeChildren(node, options);
        } else {
            if (node.tagName) {
                return serializeTag(node, options, isRootNode);
            } else if (node.nodeName === '#text') {
                return serializeText(node);
            } else if (node.nodeName === '#comment') {
                return serializeComment(node);
            } else if (node.nodeName === '#cdata-section') {
                return serializeCDATA(node);
            }
        }
    };

    return {
        serializeToString: function (node, options) {
            options = options || {};
            options.useSelfClosingTags = options.useSelfClosingTags === undefined ? true : options.useSelfClosingTags;
            options.addSpaceBeforeEndOfSelfClosingTag = options.addSpaceBeforeEndOfSelfClosingTag !== undefined;

            return removeInvalidCharacters(nodeTreeToXHTML(node, options, true));
        }
    };
}));
