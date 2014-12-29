JsUploader = Class.create();
JsUploader.prototype = {
    uploader: null,
    containerId: null,
    container: null,
    config: null,
    files: null,
    fileRowTemplate: null,
    templatesPattern: /(^|.|\r|\n)(\{\{(.*?)\}\})/,
    
    onFilesComplete: false,
    onFileRemove: false,
    
    initialize: function(containerId, config)
    {
        this.containerId = containerId;
        this.container   = $(containerId);

        this.container.controller = this;

        this.config = config;
        
        this.fileRowTemplate = new Template(
            this.getInnerElement('template').innerHTML,
            this.templatesPattern
        );
        
        
        this.handleBridgeInit();
    },
    
    getInnerElement: function(elementName)
    {
        return $(this.containerId + '-' + elementName);
    },
    
    getFileId: function(file)
    {
        var id;
        
        if (typeof file == 'object')
        {
            id = file.id;
        } else
        {
            id = file;
        }
        
        return this.containerId + '-file-' + id;
    },
    
    getDeleteButton: function(file)
    {
        return $(this.getFileId(file) + '-delete');
    },
    
    handleBridgeInit: function()
    {
        this.uploader = new Uploader(this.config, this.containerId);
        
        this.uploader.addListener('select', this.handleSelect.bind(this));
        this.uploader.addListener('complete', this.handleComplete.bind(this));
        this.uploader.addListener('progress',  this.handleProgress.bind(this));
        this.uploader.addListener('error', this.handleError.bind(this));
        
        this.uploader.initUploadBlocks();
    },
    
    upload: function()
    {
        this.uploader.upload();
        this.files = this.uploader.getFilesInfo();
        this.updateFiles();
    },
    
    removeFile: function(id)
    {
        this.uploader.removeFile(id);
        $(this.getFileId(id)).remove();
        
        if (this.onFileRemove)
        {
            this.onFileRemove(id);
        }
        
        this.files = this.uploader.getFilesInfo();
        this.updateFiles();
    },
    
    handleSelect: function(files)
    {
        this.files = files;
        this.updateFiles();
        this.getInnerElement('upload').show();
    },
    
    handleProgress: function(file)
    {
        this.updateFile(file);
        
        this.onFileProgress(file);
    },
    
    handleError: function(file)
    {
        this.updateFile(file);
    },
    
    handleComplete: function(files)
    {
        this.files = files;
        this.updateFiles();
        
        if (this.onFilesComplete)
        {
            this.onFilesComplete(this.files);
        }
        
    },
    
    updateFiles: function ()
    {
        this.files.each(function(file) {
            this.updateFile(file);
        }.bind(this));
    },
    
    updateFile: function (file)
    {
    
        if (!$(this.getFileId(file)))
        {
            Element.insert(this.container, {bottom: this.fileRowTemplate.evaluate(this.getFileVars(file))});
        }
        
        if (file.status == 'full_complete' && file.response.isJSON())
        {
            var response = file.response.evalJSON();
            
            if (typeof response == 'object')
            {
            
                if (typeof response.cookie == 'object')
                {
                    var date = new Date();
                    date.setTime(date.getTime()+(parseInt(response.cookie.lifetime)*1000));

                    document.cookie = escape(response.cookie.name) + "="
                        + escape(response.cookie.value)
                        + "; expires=" + date.toGMTString()
                        + (response.cookie.path.blank() ? "" : "; path=" + response.cookie.path)
                        + (response.cookie.domain.blank() ? "" : "; domain=" + response.cookie.domain);
                }
                
                if (typeof response.error != 'undefined' && response.error != 0) {
                    file.status = 'error';
                    file.errorText = response.error;
                }
            }
        }
        
        if (file.status == 'full_complete' && !file.response.isJSON())
        {
            file.status = 'error';
        }

        var progress = $(this.getFileId(file)).getElementsByClassName('progress-text')[0];
        
        if (file.status=='error')
        {
            $(this.getFileId(file)).addClassName('error');
            $(this.getFileId(file)).removeClassName('progress');
            $(this.getFileId(file)).removeClassName('new');
            
            var errorText = file.errorText;

            progress.update(errorText);
            
            this.getDeleteButton(file).show();

        } else if (file.status=='full_complete')
        {
            $(this.getFileId(file)).addClassName('complete');
            $(this.getFileId(file)).removeClassName('progress');
            $(this.getFileId(file)).removeClassName('error');
            
            progress.update(this.translate('Complete'));
        }
    },
    
    getFileVars: function(file)
    {
        return {
            id      : this.getFileId(file),
            fileId  : file.id,
            name    : file.name
        };
    },

    translate: function(text)
    {
    
        try
        {
        
            if(Translator)
            {
                return Translator.translate(text);
            }
            
        } catch(e){}
        
        return text;
    },
    
    onFileProgress: function(file)
    {
        $(this.getFileId(file)).addClassName('progress');
        $(this.getFileId(file)).removeClassName('new');
        $(this.getFileId(file)).removeClassName('error');
    
        var progress = $(this.getFileId(file)).getElementsByClassName('progress-text')[0];
        progress.update(this.translate('Uploading'));

        if (!this.config.replace_browse_with_remove)
        {
            this.getDeleteButton(file).hide();
        }
        
    }
    
}