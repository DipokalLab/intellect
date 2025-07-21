import React from "react";

interface TopRightTitleProps {
  title: string;
}

const TopRightTitle: React.FC<TopRightTitleProps> = ({ title }) => {
  return (
    <div className="hidden md:flex">
      <b className="absolute top-0 right-0 m-4 text-sm font-bold text-gray-500">
        {title}
      </b>
    </div>
  );
};

export default TopRightTitle;
