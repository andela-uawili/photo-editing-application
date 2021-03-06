
var facebook = {

  socialLoginRoute: '/auth/facebook/',
  SDKSource: '//connect.facebook.net/en_US/sdk.js',
  userFields: 'id,email,first_name,last_name,picture',

  messages: {
    FBLoggingIn: '<i class="fa fa-spinner fa-fw fa-spin"></i> connecting to Facebook...',
    FBLogInFailed: '<i class="fa fa-frown-o fa-fw"></i> Could not log in with Facebook!',
    authLoggingIn: '<i class="fa fa-spinner fa-fw fa-spin"></i> Logging in...'
  },

  appConfig: {
    appId: $('meta[name="facebook_app_id"]').attr('content'),
    version: 'v2.5',
    cookie: true
  },
  
  // intializes facebook related features:
  init: function(){
    facebook.initSDK();
    facebook.configUI();
  },

  // loads and initializes the facebook-Javascipt SDK
  initSDK: function(){
    $.ajaxSetup({ cache: true });
    $.getScript(facebook.SDKSource, function(){
        FB.init(facebook.appConfig);
      }
    );
  },

  // gets Jquery selections for the UI elements
  // related with this component.
  configUI: function(){
    facebook.loginButton = $('#facebook-login-action');
    facebook.LoginStatusLabel = $('#facebook-login-status');
    facebook.csrfForm = $('#login-csrf');
    facebook.registerEventHandlers();
  },   

  // bind event listeners to the component
  // UI elements where necessary:
  registerEventHandlers: function(){
    facebook.loginButton.click(facebook.onLoginClicked);
  },

  // event handler for log
  onLoginClicked: function(){
    facebook.LoginStatusLabel.html(facebook.messages.FBLoggingIn);
    FB.login(
      facebook.onFBLoginResponse,
      {scope: 'email,user_likes'}
    );
  },

  // process the facebook login response
  onFBLoginResponse: function(response){
    if (response.status === 'connected') {
      // log the user in on our server:
      facebook.getUser(facebook.authLogin);
    } else {
      // show error status:
      facebook.LoginStatusLabel.html(facebook.messages.FBLogInFailed);
    }
  },

  // gets the facebook user's profile and
  // executes the callback with the response.
  getUser: function(callback){
    FB.api(
      '/me', 
      {fields: facebook.userFields}, 
      function(response) {    
        callback(response);
      }
    );
  },

  share: function(url, callback) {
    FB.ui({
      method: 'share',
      href: url,
    }, callback);
  },

  // function that logs the user in on the server
  // using their facebook details.
  authLogin: function(response) {
    // set the preloader message:
    facebook.LoginStatusLabel.html(
        'Hi ' + response.last_name + ", logging you in..."
    );
    // set the photoURL:
    response.photo = response.picture.data.url;
    // send ajax login request:
    $.ajax({
      url: facebook.socialLoginRoute,
      type: 'POST',
      data: response,
      dataType: 'json',
      headers: {
        'X-CSRFToken': facebook.csrfForm.find('input[name="csrfmiddlewaretoken"]').val()
      },
      success: facebook.onAuthLoginResponse,
      error: facebook.onAuthLoginFailed
    });
  },

  onAuthLoginResponse: function(response) {
    if (response.status == 'success'){
      //show success message:
      facebook.LoginStatusLabel.html('Logged in!');
      // redirect loginRedirectURL:
      location.href = response.loginRedirectURL;
    } else {
      onAuthLoginFailed();
    }
  },

  onAuthLoginFailed: function(response) {
    facebook.LoginStatusLabel.html('Login Failed!');
  }
}


var photoList = {

  items: [],

  currentUploadCard: null,

  init: function(config){
    // default settings:
    settings = {
      baseElement: $('.photo-list'),
      addButton: $('.photo-list .add-photo'),
      list: $('.photo-list .list .scrollable-y'),
      status: $('.photo-list .list-status'),

      loadPhotosRoute: '/dashboard/photos/',

      emptyStatusMsg: 'You currently have no uploaded photos.<br>Use the ‘+’ button above to upload.',
      loadingMsg: '<i class="fa fa-spinner fa-fw fa-spin"></i> Loading photos...',
      loadFailedMsg: '<i class="fa fa-frown-o fa-fw"></i> Sorry, an error occured!<br>Your Photos could not be loaded.'
    }
    // customize settings with config if provided:
    $.extend( settings, config );
    // apply settings to the component:
    $.extend( photoList, settings );
    //run other initializations:
    photoList.setEvents();
    photoList.loadList();
  },

  setEvents: function(statusMsg){
    photoList.addButton.click(photoList.addNewPhoto);
  },

  addNewPhoto: function(){
    if(photoList.currentUploadCard){
      photoList.scrollToItem(photoList.currentUploadCard);
      return;
    }
    var photoCard = PhotoCard();
    photoCard.setState(photoCard.states.UPLOAD);
    photoList.add(photoCard);
    photoList.currentUploadCard = photoCard;
    photoList.scrollToItem(photoCard);
    photoList.showList();
  },

  showStatus: function(statusMsg){
    // hide the list:
    photoList.list.hide();
    // show set and show the status message:
    photoList.status.html(statusMsg);
    photoList.status.show();
  },

  showList: function(){
    if (photoList.items.length) {
      // clear and hide the status message:
      photoList.status.html('');
      photoList.status.hide();
      // show the list:
      photoList.list.show();
    } else {
      // show empty prompt:
      photoList.showStatus(photoList.emptyStatusMsg);
    }
  },

  loadList: function(){
    // show the loading message:
    photoList.showStatus(photoList.loadingMsg);
    // send ajax request:
    $.ajax({
      url: photoList.loadPhotosRoute,
      type: 'GET',
      dataType: 'json',
      success: photoList.onLoadResponse,
      error: photoList.onLoadFailed
    });
  },

  onLoadResponse: function(response) {
    if (response.status == 'success'){
      // process response data and load the list with it:
      for(var i = 0; i < response.data.length; i++){
        var photoData = response.data[i];
        var photoCard = PhotoCard();
        photoCard.setState(photoCard.states.UPLOADED, photoData);
        photoList.add(photoCard);
      }
      // show the loaded list:
      photoList.showList();
    } else {
      photoList.onLoadFailed();
    }
  },

  onLoadFailed: function() {
    // show failed prompt:
    photoList.showStatus(photoList.loadFailedMsg);
  },

  add: function(photoCard) {
    this.items.push(photoCard);
    this.list.prepend(photoCard.baseElement);
    photoCard.setEvents();
  },

  scrollToItem: function(photoCard){
    photoList.list.scrollTop(photoCard.baseElement.position().top);
  }

}


var PhotoCard = function(config){
  var photoCard = {
    
    photoData: null,

    baseImageURL: '/media/photos/',
    baseUpdateDeleteURL: '/dashboard/photos/',

    states: {
      UPLOAD: 'upload',
      UPLOADING: 'uploading',
      UPLOADED: 'uploaded'
    },

    init: function(config){
      // default settings:
      settings = {};
      settings.baseElement = $('#generic-photo-card').clone();
      settings.baseElement.removeAttr('id');
      settings.cancelBtn = settings.baseElement.find('.cancel-btn');
      
      settings.uploadDiv = settings.baseElement.find('.upload');
      settings.uploadForm = settings.baseElement.find('.upload-form');
      settings.browseBtn = settings.uploadDiv.find('.browse-file');
      settings.fileInput = settings.uploadDiv.find('.upload-form input');
      settings.fileInfo = settings.uploadDiv.find('.file-info');
      settings.uploadBtn = settings.uploadDiv.find('.upload-photo');

      settings.uploadingDiv = settings.baseElement.find('.uploading');
      settings.filename = settings.uploadingDiv.find('.filename');
      settings.statusMsg = settings.uploadingDiv.find('.status .message');
      settings.statusValue = settings.uploadingDiv.find('.status .value');
      settings.progressBarTotal = settings.uploadingDiv.find('.progress-bar .total');
      settings.progressBarProgress = settings.uploadingDiv.find('.progress-bar .progress');
      
      settings.uploadedDiv = settings.baseElement.find('.uploaded');
      settings.image = settings.uploadedDiv.find('.image-wrapper img');
      settings.caption = settings.uploadedDiv.find('.details .caption');
      settings.date = settings.uploadedDiv.find('.details .date');
      settings.editCaptionBtn = settings.uploadedDiv.find('.edit-caption');
      settings.applyEffectsBtn = settings.uploadedDiv.find('.apply-effects');
      settings.sharePhotoBtn = settings.uploadedDiv.find('.share-photo');
      settings.downloadPhotoBtn = settings.uploadedDiv.find('.download-photo');
      settings.deletePhotoBtn = settings.uploadedDiv.find('.delete-photo');

      settings.deleteOverlay = settings.baseElement.find('.delete-overlay');
      settings.deleteDirective = settings.deleteOverlay.find('.directive');
      settings.confirmDeleteBtn = settings.deleteOverlay.find('.confirm-delete-photo');

      settings.captionOverlay = settings.baseElement.find('.caption-overlay');
      settings.captionDirective = settings.captionOverlay.find('.directive');
      settings.captionInput = settings.captionOverlay.find('.caption-input');
      settings.saveCaptionBtn = settings.captionOverlay.find('.save-caption');

      settings.csrfForm = settings.baseElement.find('.csrf-form');
      settings.overlays = settings.baseElement.find('.overlay');

      // customize settings with config if provided:
      $.extend( settings, config );
      // apply settings to the component:
      $.extend( this, settings );
    },

    setState: function(state, data){
      // set the currentState for this photoCard:
      this.currentState = state;
      // hide any overlays:
      this.overlays.hide();
      // run any state-specific initializations:
      if(this.currentState == this.states.UPLOAD){
          this.uploadDiv.show();
          this.uploadDiv.css({display:'flex'});
          this.uploadingDiv.hide();
          this.uploadedDiv.hide();
          this.initFileUpload();

      }else if(this.currentState == this.states.UPLOADING){
          this.uploadDiv.hide();
          this.uploadingDiv.show();
          this.uploadingDiv.css({display:'flex'});
          this.uploadedDiv.hide();
          this.filename.text(this.fileInfo.text());

      }else if(this.currentState == this.states.UPLOADED){
          this.uploadDiv.hide();
          this.uploadingDiv.hide();
          this.uploadedDiv.show();
          this.uploadedDiv.css({display:'flex'});
          this.cancelBtn.hide();
          this.photoData = data;
          this.image.attr('src', this.buildPhotoURL(this.photoData));
          this.image.closest('.image-wrapper').imgLiquid(imageLiquid.config.filled);
          this.caption.text(this.photoData.caption);
          this.date.text(this.photoData.date);
      }
    },

    buildPhotoURL: function(photoData, useHost) {
      var photoURL = '';
      if(useHost)
        photoURL += 'http://' + location.host;
      photoURL += this.baseImageURL + photoData.username + '/';
      if(photoData.effects)
        photoURL += photoData.effects + '/';
      photoURL += photoData.filename;
      return photoURL;
    },

    setEvents: function() {
      this.clearEvents();
      // register event listeners based on this.currentState.
      if(this.currentState == this.states.UPLOAD){
          this.browseBtn.click(this.onUploadBrowse);
          this.cancelBtn.click(this.onCancel);
      }else if(this.currentState == this.states.UPLOADING){
          // no events yet :(
      }else if(this.currentState == this.states.UPLOADED){
          this.applyEffectsBtn.click(this.openInEditor);
          this.editCaptionBtn.click(this.openCaptionOverlay);
          this.sharePhotoBtn.click(this.shareOnFacebook);
          this.downloadPhotoBtn.click(this.downloadPhoto);
          this.deletePhotoBtn.click(this.openDeleteOverlay);
          this.confirmDeleteBtn.click(this.delete);
          this.saveCaptionBtn.click(this.saveCaption);
          this.cancelBtn.click(this.onCancel);
      }
    },

    clearEvents: function() {
      // clear event listeners.
      this.browseBtn.off('click');
      this.applyEffectsBtn.off('click');
      this.editCaptionBtn.off('click');
      this.cancelBtn.off('click');
      this.sharePhotoBtn.off('click');
      this.downloadPhotoBtn.off('click');
      this.deletePhotoBtn.off('click');
    },

    onUploadBrowse: function(e) {
      e.preventDefault();
      photoCard.fileInput.click();
    },

    onUploadAdd: function (e, data) {
      // This function is called when a file is added to the queue;
      // either via the browse button, or via drag/drop:

      // show the file name and file size:
      info = data.files[0].name + " (" + photoCard.formatFileSize(data.files[0].size) + ")"
      photoCard.fileInfo.text(info);

      // enable and set the upload button:
      photoCard.uploadBtn.removeClass('disabled');
      photoCard.uploadBtn.click(function(){
        photoCard.setState(photoCard.states.UPLOADING, data);
        photoList.currentUploadCard = null;
        photoCard.jqXHR = data.submit();
      });
    },

    onUploadProgress: function(e, data){
      // Calculate the completion percentage of the upload
      var progress = parseInt(data.loaded / data.total * 100, 10);
      // Update the progressBar:
      photoCard.statusMsg.text('uploading...');
      photoCard.statusValue.text(progress+'%');
      photoCard.progressBarProgress.css('width', progress+'%');
      // check for completion:
      if(progress == 100){
          photoCard.statusMsg.text('Done!')
      }
    },

    onUploadSuccess: function(e, data){
      if (data.result.status == 'success')
        photoCard.setState(photoCard.states.UPLOADED, data.result.photoData);
      else
        photoCard.onUploadFail();
    },

    onUploadFail: function(e, data){
      // Something has gone wrong!
      photoCard.statusMsg.text('Upload failed!');
      photoCard.statusValue.text('');
      photoCard.uploadingDiv.addClass('error');
      photoCard.progressBarProgress.css('width', '0');
    },

    formatFileSize: function(bytes) {
        if(typeof bytes !== 'number')
            return '';

        if(bytes >= 1000000000)
            return (bytes / 1000000000).toFixed(2) + ' GB';

        if(bytes >= 1000000)
            return (bytes / 1000000).toFixed(2) + ' MB';

        return (bytes / 1000).toFixed(2) + ' KB';
    },

    initFileUpload: function(){
      // init the fileupload plugin on the uploadForm
      this.uploadForm.fileupload({
        dataType: 'json',
        dropZone: settings.uploadDiv,
        acceptFileTypes: /(\.|\/)(gif|bmp|jpe?g|png)$/i,
        maxNumberOfFiles: 1,
        maxFileSize: 10000000,
        add: this.onUploadAdd,
        progress: this.onUploadProgress,
        done: this.onUploadSuccess,
        fail: this.onUploadFail
      });
      // Prevent the default action when a file is dropped on the window
      $(document).on('drop dragover', function(e) {
          e.preventDefault();
      });
    },

    openInEditor: function(e){
      e.preventDefault();
      editor.openPhoto(photoCard);
    },

    save: function(photoData){
      // build the request url:
      url = photoCard.baseUpdateDeleteURL + photoData.public_id + '/';
      // send ajax login request:
      photoCard.jqXHR = $.ajax({
        url: url,
        type: 'POST',
        data: photoData,
        dataType: 'json',
        headers: {
          'X-CSRFToken': photoCard.csrfForm.find('input[name="csrfmiddlewaretoken"]').val()
        },
        success: photoCard.onSaveResponse,
        error: photoCard.onSaveFailed
      });
    },

    onSaveResponse: function(response) {
      if (response.status == 'success'){
        // reset the photoCard uploaded state:
        photoCard.setState(photoCard.states.UPLOADED, response.photoData);
        // show success toast:

        // inform the editor:
        if (editor.currentPhotoCard == photoCard)
          editor.onSaveSuccess();

      } else {
        onSaveFailed();
      }
    },

    onSaveFailed: function() {
      // show failure toast:

      // inform the editor:
      if (editor.currentPhotoCard == photoCard)
        editor.onSaveFailed();
      // inform the editor:
      if (editor.currentOverlay == photoCard.captionOverlay)
        photoCard.captionDirective.html(
          '<i class="fa fa-frown-o fa-fw"></i> Error, the caption could not be saved!'
        );
    },

    delete: function(){
      // show preloader:
      photoCard.deleteDirective.html(
        '<i class="fa fa-spinner fa-fw fa-spin"></i> Deleting...'
      );
      // build the request url:
      url = photoCard.baseUpdateDeleteURL + photoCard.photoData.public_id + '/';
      // send ajax login request:
      photoCard.jqXHR = $.ajax({
        url: url,
        type: 'DELETE',
        dataType: 'json',
        headers: {
          'X-CSRFToken': photoCard.csrfForm.find('input[name="csrfmiddlewaretoken"]').val()
        },
        success: photoCard.onDeleteResponse,
        error: photoCard.onDeleteFailed
      });
    },

    onDeleteResponse: function(response) {
      if (response.status == 'success'){
        // close the editor if necessary:
        if (editor.currentPhotoCard == photoCard)
          editor.closePhoto();
        // clear any registered event handlers:
        photoCard.clearEvents();
        // remove this card from the photoList:
        photoCard.baseElement.remove();
        var photoCardIndex = photoList.items.indexOf(photoCard);
        if(photoCardIndex > -1) photoList.items.splice(photoCardIndex, 1);
        if(photoList.currentUploadCard == photoCard)
          photoList.currentUploadCard = null;
        photoList.showList();
        // show success toast:

      } else {
        onDeleteFailed();
      }
    },

    onDeleteFailed: function() {
      // show failure toast:

      // inform the editor:
      if (editor.currentOverlay == photoCard.deleteOverlay)
        photoCard.deleteDirective.html(
          '<i class="fa fa-frown-o fa-fw"></i> Sorry, photo deletion failed!'
        );
    },

    onCancel: function() {
      if (photoCard.currentState == photoCard.states.UPLOADED){
        photoCard.closeOverlay();
      } else {
        // stop any ongoing ajax requests:
        if(photoCard.jqXHR) photoCard.jqXHR.abort();
        // clear any registered event handlers:
        photoCard.clearEvents();
        // remove this card from the photoList:
        photoCard.baseElement.remove();
        var photoCardIndex = photoList.items.indexOf(photoCard);
        if(photoCardIndex > -1) photoList.items.splice(photoCardIndex, 1);
        if(photoList.currentUploadCard == photoCard)
          photoList.currentUploadCard = null;
        photoList.showList();
      }
    },

    shareOnFacebook: function() {
      facebook.share(
        photoCard.buildPhotoURL(photoCard.photoData, true),
        photoCard.onFBShareResponse
      );
    },

    onFBShareResponse: function(response){
      // toast to successful share!
    },

    downloadPhoto: function(){
      // build the photo url and add the download flag
      // as a query string param:
      url =  photoCard.buildPhotoURL(photoCard.photoData, true),
      url += '?download=true';
      // redirect to download:
      location.href = url;
    },

    openCaptionOverlay: function(){
      // initialize the overlay:
      photoCard.captionDirective.html('<span>Caption this Photo:</span>');
      photoCard.captionInput.val(photoCard.photoData.caption);
      // show overlay:
      photoCard.openOverlay(photoCard.captionOverlay);
    },

    openDeleteOverlay: function(){
      // initialize the overlay:
      photoCard.deleteDirective.html('Are you sure?<br>Click the button below to confirm.');
      // show overlay:
      photoCard.openOverlay(photoCard.deleteOverlay);
    },

    openOverlay: function(overlay){
      // show the overlay:
      photoCard.currentOverlay = overlay;
      photoCard.currentOverlay.fadeIn();
      photoCard.cancelBtn.show();
    },

    closeOverlay: function(){
      // initialize the overlay:
      photoCard.cancelBtn.hide();
      photoCard.currentOverlay.fadeOut();
      photoCard.currentOverlay = null;
    },

    saveCaption: function(){
      photoCard.captionDirective.html(
        '<i class="fa fa-spinner fa-fw fa-spin"></i> Saving...'
      );
      photoData = $.extend({}, photoCard.photoData)
      photoData.caption = photoCard.captionInput.val();
      photoCard.save(photoData); 
    }

  }

  photoCard.init(config);
  return photoCard;
}


var editor = {

  init: function(config){
    // default settings:
    settings = {
      baseElement: $('.editor'),
      caption: $('.editor .title .caption'),
      effects: $('.editor .title .effects'),
      undoButton: $('.options .undo'),
      resetButton: $('.options .reset'),
      saveButton: $('.options .save-changes'),
      cancelButton: $('.options .cancel'),
      cumulativeCheckbox: $('.effects-header #cumulative-cbox'),
      stageImage: $('.stage img'),
      effectItems: $('.effect-card'),

      baseImageURL: '/media/photos/',
      useCumulativeEffects: false,
         }
    // customize settings with config if provided:
    $.extend( settings, config );
    // apply settings to the component:
    $.extend( this, settings );
    //run other initializations:
    this.closeUI();
  },

  closeUI: function(){
    // hide all the direct children of the editor
    // until a photo is selected for editing:
    this.baseElement.children().css('opacity', 0);
    this.baseElement.children().css('pointer-events', 'none');
    this.baseElement.removeClass('active');
  }, 

  openUI: function(){
    // hide all the direct children of the editor
    // until a photo is selected for editing:
    this.baseElement.children().css('opacity', 1);
    this.baseElement.children().css('pointer-events', 'auto');
    this.baseElement.addClass('active');
  },

  openPhoto: function(photoCard){
    this.currentPhotoCard = photoCard;
    this.photoData = $.extend( {}, photoCard.photoData );
    // update the caption/effect text:
    this.caption.text(this.photoData.caption);
    this.setEffectsText(this.photoData.effects);
    // set the stage image source to that of the photoCard:
    this.setStageImage(this.photoData);
    // for each effects list item, set the image source to that
    // of the photoCard with specific effect applied:
    this.effectItems.each(function(){
      effectImage = $(this).find('img');
      effectPhotoData = $.extend( {}, editor.photoData );
      effectPhotoData.effects = $(this).data('effectName');
      effectImage.attr('src', editor.buildPhotoURL(effectPhotoData)+'?thumbnail=true');
      effectImage.closest('.image-wrapper').imgLiquid(imageLiquid.config.filled);
    });
    // set the initial state of the cumulative checkbox:
    this.cumulativeCheckbox.prop( "checked", this.useCumulativeEffects );
    // set events for editor UI components:
    this.setEvents();
    //show the editor:
    this.openUI();
    // scroll photoList to that photoCard's position:
    // photoList.scrollToItem(photoCard);
  },

  closePhoto: function(){
    editor.currentPhotoCard = null;
    editor.photoData = null;
    // clear the caption/effect text:
    editor.caption.text('');
    editor.setEffectsText('');
    // set the stage image source to that of the photoCard:
    editor.stageImage.attr('src', '');
    editor.stageImage.closest('.image-wrapper').imgLiquid(imageLiquid.config.filled);
    // for each effects list item, clear the image source:
    editor.effectItems.each(function(){
      effectImage = $(this).find('img');
      effectImage.attr('src', '');
      effectImage.closest('.image-wrapper').imgLiquid(imageLiquid.config.filled);
    });
    //close the editor:
    editor.closeUI();
  },

  buildPhotoURL: function(photoData) {
    var photoURL = this.baseImageURL + photoData.username + '/';
    if(photoData.effects)
      photoURL += photoData.effects + '/';
    photoURL += photoData.filename;
    return photoURL;
  },

  applyEffect: function() {
    // append the new effect.
    // apply cumulatively if set:
    if(editor.useCumulativeEffects){
      if(editor.photoData.effects) editor.photoData.effects += ",";
      editor.photoData.effects += $(this).data('effectName');
    } else {
      editor.photoData.effects = $(this).data('effectName');
    }
    // update the stage image with effect:
    editor.setStageImage(editor.photoData);
    // update the caption/effect text:
    editor.setEffectsText(editor.photoData.effects);
  },

  undoEffect: function() {
    // remove the last effect from the photoData effects list:
    effects = editor.photoData.effects;
    effects = effects.split(',')
    effects.pop();
    editor.photoData.effects = effects.join();
    // update the stage image with effect:
    editor.setStageImage(editor.photoData);
    // update the caption/effect text:
    editor.setEffectsText(editor.photoData.effects);
  },

  resetEffects: function() {
    // clear the effects on editor.photoData
    editor.photoData.effects = '';
    // update the stage image with effect:
    editor.setStageImage(editor.photoData);
    // update the caption/effect text:
    editor.setEffectsText(editor.photoData.effects);
  },

  saveEffects: function() {
    editor.effects.html(
      ' <i class="fa fa-spinner fa-fw fa-spin"></i> Saving effects...'
    );
    editor.currentPhotoCard.save(editor.photoData);
  },

  onSaveSuccess: function(response) {
    //refresh the editor:
    editor.openPhoto(editor.currentPhotoCard);
  },

  onSaveFailed: function() {
    editor.effects.html(
      ' <i class="fa fa-frown-o fa-fw"></i> Sorry, the applied effects could not be saved!'
    );
  },

  setEffectsText: function(effectsText){
    if(effectsText)
      editor.effects.text(" : " + effectsText);
    else 
      editor.effects.text('');
  },

  setStageImage: function(photoData){
    editor.stageImage.attr('src', editor.buildPhotoURL(photoData));
    editor.stageImage.closest('.image-wrapper').imgLiquid(imageLiquid.config.fitted);
  },

  setCumulative: function(e) {
    editor.useCumulativeEffects = $(this).is(':checked');
  },

  setEvents: function() {
    this.clearEvents();
    this.undoButton.click(this.undoEffect);
    this.resetButton.click(this.resetEffects);
    this.saveButton.click(this.saveEffects);
    this.cancelButton.click(this.closePhoto);
    this.cumulativeCheckbox.change(this.setCumulative);
    // register event listeners on effect items:
    this.effectItems.each(function(){
      $(this).click(editor.applyEffect);
    });
  },

  clearEvents: function() {
    this.undoButton.off('click');
    this.resetButton.off('click');
    this.saveButton.off('click');
    this.cancelButton.off('click');
    this.cumulativeCheckbox.off('change');
    // clear event listeners on effect items:
    this.effectItems.each(function(){
      $(this).off('click');
    });
  }
}


var imageLiquid = {
  // jquery plugin for fitting images
  // within their containers.
  config: {
    filled: {
      fill: true,
      horizontalAlign: "center",
      verticalAlign: "center"
    },
    fitted: {
      fill: false,
      horizontalAlign: "center",
      verticalAlign: "center"
    }
  },

  init: function(customConfig){
    // Allow overriding of the default config:
    $.extend(imageLiquid.config, customConfig);

    // intializes the plugin on images:
    $('.imgLiquidFill.imgFilled').imgLiquid(
      imageLiquid.config.filled
    );
    $('.imgLiquidFill.imgFitted').imgLiquid(
      imageLiquid.config.fitted
    );
  },
}


$(document).ready(function() {
  facebook.init();
  photoList.init();
  editor.init();
  imageLiquid.init();
});

