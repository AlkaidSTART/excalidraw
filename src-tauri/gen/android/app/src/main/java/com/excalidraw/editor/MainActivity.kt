package com.excalidraw.editor

import android.os.Bundle
import android.view.KeyEvent
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  private lateinit var webView: WebView

  override fun onWebViewCreate(webView: WebView) {
    this.webView = webView
  }

  private fun handleBackPress() {
    if (!::webView.isInitialized) {
      finish()
      return
    }

    webView.evaluateJavascript(
      """
      (function () {
        try {
          return window.__handleAndroidBack
            ? window.__handleAndroidBack() === "exit"
            : true;
        } catch (_) {
          return true;
        }
      })()
      """.trimIndent(),
    ) { result ->
      if (result == "true") {
        finish()
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    onBackPressedDispatcher.addCallback(
      this,
      object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          handleBackPress()
        }
      },
    )
  }

  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    if (event.keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_DOWN) {
      handleBackPress()
      return true
    }
    return super.dispatchKeyEvent(event)
  }
}
