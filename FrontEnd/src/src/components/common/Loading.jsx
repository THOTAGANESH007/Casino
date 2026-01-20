const Loading = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-100 space-y-4">
      <div className="w-16 h-16 border-4 border-gray-200 border-t-primary-600 rounded-full animate-spin"></div>
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  );
};

export default Loading;
