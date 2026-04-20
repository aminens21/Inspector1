import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
      let details = "";

      try {
        if (this.state.error?.message.startsWith('{')) {
          const errInfo = JSON.parse(this.state.error.message);
          if (errInfo.error.includes("Missing or insufficient permissions")) {
            errorMessage = "خطأ في الصلاحيات: ليس لديك الإذن الكافي لإجراء هذه العملية.";
          } else {
            errorMessage = `خطأ في قاعدة البيانات: ${errInfo.error}`;
          }
          details = JSON.stringify(errInfo, null, 2);
        }
      } catch (e) {
        // Fallback to default message
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 dir-rtl">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-arabic">عذراً، حدث خطأ</h2>
            <p className="text-gray-600 mb-8 font-arabic leading-relaxed">
              {errorMessage}
            </p>
            {details && (
              <details className="mb-6 text-left bg-gray-50 p-4 rounded-lg text-xs font-mono overflow-auto max-h-40">
                <summary className="cursor-pointer text-gray-500 mb-2 font-arabic">تفاصيل الخطأ</summary>
                <pre>{details}</pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors duration-200 font-arabic"
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
