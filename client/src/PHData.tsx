import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table } from 'react-bootstrap';

interface PHData {
  _id: string;
  pH: number;
  timestamp: string;
}

const PHDataComponent: React.FC = () => {
  const [phData, setPhData] = useState<PHData[]>([]);

  useEffect(() => {
    const fetchPHData = async () => {
      try {
        const response = await axios.get('/api/phdata'); // Ubah sesuai endpoint API
        setPhData(response.data);
      } catch (error) {
        console.error('Error fetching pH data:', error);
      }
    };

    fetchPHData();
    const interval = setInterval(fetchPHData, 5000); // Refresh setiap 5 detik

    return () => clearInterval(interval); // Bersihkan interval saat komponen di-unmount
  }, []);

  return (
    <div className="container">
      <h2>Real-Time pH Data</h2>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>ID</th>
            <th>pH</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {phData.map((data) => (
            <tr key={data._id}>
              <td>{data._id}</td>
              <td>{data.pH}</td>
              <td>{new Date(data.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default PHDataComponent;
