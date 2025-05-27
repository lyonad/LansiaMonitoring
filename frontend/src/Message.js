import React, { useState } from 'react';

function Message(props) {
  const [name, setName] = useState(props.name);

  const handleClick = () => {
    setName("Budi");
  };

  return (
    <div>
      <h2>Halo, {name}!</h2>
      <button onClick={handleClick}>Ubah Nama</button>
    </div>
  );
}

export default Message;
