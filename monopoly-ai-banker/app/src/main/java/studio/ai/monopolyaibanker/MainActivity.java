package studio.ai.monopolyaibanker;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.ViewGroup;
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
    private String cameraPhotoPath;

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
        if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
            File photoFile = createImageFile();
            if (photoFile != null) {
                cameraPhotoPath = photoFile.getAbsolutePath();
                Uri photoUri = FileProvider.getUriForFile(this,
                        "studio.ai.monopolyaibanker.fileprovider", photoFile);
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
                takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } else {
                takePictureIntent = null;
            }
        }

        Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
        contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
        contentSelectionIntent.setType("image/*");

        Intent chooserIntent = Intent.createChooser(contentSelectionIntent, "Scan photo");
        if (takePictureIntent != null) {
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
            } else if (cameraPhotoPath != null) {
                results = new Uri[]{Uri.fromFile(new File(cameraPhotoPath))};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
        cameraPhotoPath = null;
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
