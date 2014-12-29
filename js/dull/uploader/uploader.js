Uploader = Class.create();
Uploader.prototype = {
    config: null,
    containerId: null,
    id: 0,
    unfinishedUploads: 0,
    
    files: [],
    uploadFiles: [],
    
    completeMethod: false,
    progressMethod: false,
    selectMethod: false,
    errorMethod: false,
    
    templatesPattern: /(^|.|\r|\n)(\{\{(.*?)\}\})/,
    
    fileIdPrefix: 'file_',
    
    statusComplete: 'full_complete',
    statusError: 'error',
    statusNew: 'new',
    
    templateSuffix: '-uploadBlockTemplate',
    htmlIdBlock: 'uploadBlock-',
    htmlIdBlocks: 'uploadBlocks',

    initialize: function(config, containerId)
    {
        this.config = config;
        this.containerId = containerId;
    },
    
    initUploadBlocks: function()
    {
        Element.insert($(this.htmlIdBlocks), {bottom: this.createTemplate(this).evaluate(this.getValues(this))});
        this.addUploadBlock(this.getValues(this));
    },
    
    createTemplate: function(reference)
    {
        return new Template(
            $(reference.containerId + reference.templateSuffix).innerHTML,
            reference.templatesPattern
        );
    },
    
    createUploadFile: function(reference, frame, response)
    {
        var frameId = reference.getId(frame.parentNode.id, reference.htmlIdBlock);
        var status = reference.statusError;
        var size = 0
        
        if (response.evalJSON().error == 0)
        {
            status = reference.statusComplete;
            size = response.evalJSON().size;
        }
        
        var uploadFile = Object();
        uploadFile.id = reference.fileIdPrefix + frameId;
        uploadFile.progress = Object();
        uploadFile.name = reference.getForm(frame.parentNode).getElementsByTagName('input')[0].value;
        uploadFile.status = status;
        uploadFile.response = response;
        uploadFile.creator = null;
        uploadFile.http = 200;
        uploadFile.size = size;
        
        return uploadFile;
    },
    
    setupUploadFiles: function(reference, parentReference, event)
    {
        var frame;
            
        if (window.addEventListener)
        {
            frame = reference;
        } else
        {
            frame = event.srcElement; //for IE
        }
        
        --parentReference.unfinishedUploads;
    
        var response = frame.contentWindow.document.body.innerHTML;
        var uploadFile = parentReference.createUploadFile(parentReference, frame, response);
        
        if (response.evalJSON().error != 0)
        {
            uploadFile.errorText = response.evalJSON().error;
            parentReference.errorMethod(uploadFile);
        } else
        {
            parentReference.uploadFiles.push(uploadFile);
        }
        
        if (parentReference.unfinishedUploads == 0)
        {
            parentReference.completeMethod(parentReference.uploadFiles);
            parentReference.uploadFiles = [];
        }
        
    },
    
    getValues: function(reference)
    {
        return {id: reference.id, url: reference.config.url, formKey: reference.config.params.form_key};
    },
    
    addListener: function(event, method)
    {
        
        switch(event)
        {
            case 'select':
                this.selectMethod = method;
                break;
            case 'complete':
                this.completeMethod = method;
                break;
            case 'progress':
                this.progressMethod = method;
                break;
            case 'error':
                this.errorMethod = method;
                break;
        }
        
    },
    
    addUploadBlock: function(values)
    {
        var inputFile = this.getForm($('uploadBlock-' + values.id)).getElementsByTagName('input')[0];
        var that = this;
        
        inputFile.onchange = function()
        {
            this.style.display = 'none';
        
            ++that.id
        
            Element.insert($(that.htmlIdBlocks), {top: that.createTemplate(that).evaluate(that.getValues(that))});                                       
            that.addUploadBlock(that.getValues(that));
            
            var file = Object();
            file.id = that.fileIdPrefix + (that.id - 1);
            file.name = this.value;
            file.status = that.statusNew;
            file.creator = null;
            file.size = 0;
            
            that.files.push(file);
            
            that.selectMethod(that.files);
        }
        
    },
    
    getFilesInfo: function()
    {
        return this.files;
    },
    
    upload: function()
    {
        var uploadBlocks = $(this.htmlIdBlocks).childNodes;
        var lastUploadBlockNumber = uploadBlocks.length - 1;

        for (var i = lastUploadBlockNumber; i > 0; --i)
        {
            var iframe = uploadBlocks[i].getElementsByTagName('iframe')[0];
            var id = this.getId(uploadBlocks[i].id, this.htmlIdBlock);

            var uploadFile = Object();
            uploadFile.id = this.fileIdPrefix + id;
            this.progressMethod(uploadFile);

            var that = this;
            ++this.unfinishedUploads;
            
            var iframeOnLoad = function(event)
            {
                that.setupUploadFiles(this, that, event);
            }
            
            if (window.addEventListener)
            {
                iframe.addEventListener('load', iframeOnLoad, false);
            } else
            {
                iframe.attachEvent('onload', iframeOnLoad); // for IE
            }

        }
        
        for (var i = lastUploadBlockNumber; i > 0; --i)
        {
            this.getForm(uploadBlocks[i]).submit();
        }
        
    },
    
    removeFile: function(fileId)
    {
        var id = this.getId(fileId, this.fileIdPrefix);
        var blocks = $(this.htmlIdBlocks);
        var block = document.getElementById(this.htmlIdBlock + id);

        blocks.removeChild(block);
        
        for (var i = 0; i < this.files.length; ++i)
        {
        
            if (this.files[i].id == fileId)
            {
                this.files.splice(i, 1);
            
                break;
            }
            
        }
        
    },
    
    getId: function(id, prefix)
    {
        return parseInt(id.gsub(prefix, ''));
    },
    
    getForm: function(block)
    {
        return block.getElementsByTagName('form')[0];
    }
    
}