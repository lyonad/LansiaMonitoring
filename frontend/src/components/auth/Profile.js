import React from 'react';

function Profile() {

  const profileData = {
    imageUrl: '/images/xiao.jpg',
    name: 'Toki',
    phone: '0812-8929-8727',
    address: 'Bekasi',
  };

  return (
    <>
      <div
        style={{
          maxWidth: 300,
          margin: 'auto',
          border: '1px solid #ccc',
          padding: 20,
          borderRadius: 8,
          textAlign: 'center',
        }}
      >
        <img
          src={profileData.imageUrl}
          alt="Foto Profil"
          style={{
            width: 150,
            height: 150,
            borderRadius: '50%',
            objectFit: 'cover',
            marginBottom: 20,
          }}
        />
        <h2>{profileData.name}</h2>
        <p>
          <strong>Telepon:</strong> {profileData.phone}
        </p>
        <p>
          <strong>Alamat:</strong> {profileData.address}
        </p>
      </div>
    </>
  );
}

export default Profile;
