package studio.ai.monopolyaibanker;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Locale;

/**
 * Loads the Monopoly AI Banker web app in a WebView with a persistent AdMob
 * banner docked at the bottom -- a TWA (used previously) is a full-screen
 * Custom Tab with no layout to dock a native view in, so this app is a
 * plain WebView shell instead.
 */
public class MainActivity extends Activity {

    private static final int REQUEST_CAMERA_PERMISSION = 100;
    private static final int REQUEST_FILE_CHOOSER = 200;

    private ValueCallback<Uri[]> filePathCallback;
    private Uri cameraPhotoUri;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Built entirely in code, not declared in XML: the SDK's XML-inflation
        // constructor checks for the "adSize" attribute at inflation time --
        // before this method runs -- and renders a debug error view in its
        // place if it's absent, even though setAdSize() below is called
        // before loadAd(). Constructing programmatically avoids that check.
        AdView adView = new AdView(this);
        adView.setAdSize(AdSize.BANNER);
        adView.setAdUnitId(BuildConfig.ADMOB_BANNER_AD_UNIT_ID);
        adView.loadAd(new AdRequest.Builder().build());
        ViewGroup adContainer = findViewById(R.id.adContainer);
        adContainer.addView(adView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        WebView webView = findViewById(R.id.webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        // The web app is updated independently of app releases (hosted on
        // franceschiindustries.com); always revalidate so a fix shipped
        // there doesn't get stuck behind a stale cached index.html.
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                              FileChooserParams fileChooserParams) {
                filePathCallback = callback;
                launchImageChooser();
                return true;
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                // The web app's camera use goes through the file-chooser
                // capture flow below, not getUserMedia, so just grant
                // whatever the page asks for (matches WebView's default
                // trust level for content the app itself loads).
                request.grant(request.getResources());
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                Log.println(
                        message.messageLevel() == ConsoleMessage.MessageLevel.ERROR
                                ? Log.ERROR : Log.DEBUG,
                        "MonopolyWebView",
                        message.message() + " (" + message.sourceId() + ":" + message.lineNumber() + ")");
                return true;
            }
        });

        webView.loadUrl(BuildConfig.WEB_APP_URL);
    }

    private void launchImageChooser() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA},
                    REQUEST_CAMERA_PERMISSION);
            return;
        }
        startImageChooser();
    }

    private void startImageChooser() {
        Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        boolean cameraReady = false;
        // Note: resolveActivity() requires a <queries> declaration for this
        // action on Android 11+ (package visibility) -- without it, this
        // silently returns null even though a camera app is installed and
        // the system chooser can still launch it, leaving this intent
        // configured with no EXTRA_OUTPUT.
        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            File photoFile = createImageFile();
            if (photoFile != null) {
                try {
                    cameraPhotoUri = FileProvider.getUriForFile(this,
                            "studio.ai.monopolyaibanker.fileprovider", photoFile);
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraPhotoUri);
                    takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                            | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    cameraReady = true;
                } catch (IllegalArgumentException e) {
                    Log.e("MonopolyFileChooser", "FileProvider.getUriForFile failed for " + photoFile, e);
                }
            }
        }

        Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
        contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
        contentSelectionIntent.setType("image/*");
        contentSelectionIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        Intent chooserIntent = Intent.createChooser(contentSelectionIntent, "Scan photo");
        if (cameraReady) {
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{takePictureIntent});
        }
        startActivityForResult(chooserIntent, REQUEST_FILE_CHOOSER);
    }

    private File createImageFile() {
        try {
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new java.util.Date());
            File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            return File.createTempFile("SCAN_" + timeStamp, ".jpg", storageDir);
        } catch (IOException e) {
            return null;
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CAMERA_PERMISSION) {
            // Whether granted or denied, proceed -- if denied, the chooser
            // below still offers the gallery option via ACTION_GET_CONTENT.
            startImageChooser();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_FILE_CHOOSER || filePathCallback == null) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }

        Uri[] results = null;
        if (resultCode == Activity.RESULT_OK) {
            if (data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            } else if (data != null && data.getClipData() != null && data.getClipData().getItemCount() > 0) {
                // Modern pickers (the system Photos picker, many Files apps)
                // return the selected item via ClipData instead of the
                // legacy Intent.getData() field.
                results = new Uri[]{data.getClipData().getItemAt(0).getUri()};
            } else if (cameraPhotoUri != null) {
                // Reuse the same content:// FileProvider URI the camera wrote
                // to -- a raw file:// URI (Uri.fromFile) is blocked when
                // handed to WebView's separate renderer process on API 24+
                // and silently yields an empty file list on the JS side.
                results = new Uri[]{cameraPhotoUri};
            } else if (data != null && data.getExtras() != null && data.getExtras().get("data") instanceof Bitmap) {
                // Some camera apps ignore EXTRA_OUTPUT and fall back to
                // returning a low-res thumbnail inline via this legacy
                // "data" extra. Save it ourselves so there's still a usable
                // photo instead of nothing.
                Uri savedUri = saveThumbnailBitmap((Bitmap) data.getExtras().get("data"));
                if (savedUri != null) {
                    results = new Uri[]{savedUri};
                }
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
        cameraPhotoUri = null;
    }

    private Uri saveThumbnailBitmap(Bitmap bitmap) {
        File photoFile = createImageFile();
        if (photoFile == null) return null;
        try (java.io.FileOutputStream out = new java.io.FileOutputStream(photoFile)) {
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out);
        } catch (IOException e) {
            Log.e("MonopolyFileChooser", "failed to save thumbnail bitmap", e);
            return null;
        }
        return FileProvider.getUriForFile(this, "studio.ai.monopolyaibanker.fileprovider", photoFile);
    }

    @Override
    public void onBackPressed() {
        WebView webView = findViewById(R.id.webView);
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
