import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import Loading from '../common/Loading';
import ErrorMessage from '../common/ErrorMessage';
import Button from '../common/Button';
import Badge from '../common/Badge';

const GameMarketplace = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMarketplace();
  }, []);

  const fetchMarketplace = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getMarketplace();
      setGames(data);
    } catch (err) {
      setError('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (game) => {
    try {
      // Toggle the boolean
      await adminAPI.toggleGame(game.id, !game.is_enabled);
      // Optimistic Update
      setGames(games.map(g => 
        g.id === game.id ? { ...g, is_enabled: !g.is_enabled } : g
      ));
    } catch (err) {
      alert('Failed to update game status');
    }
  };

  if (loading) return <Loading message="Loading Game Catalog..." />;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Game Marketplace</h2>
        <p className="text-gray-500">Select games from providers to offer in your casino.</p>
      </div>

      <ErrorMessage message={error} onClose={() => setError('')} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <div key={game.id} className={`border rounded-xl p-6 shadow-sm transition-all ${game.is_enabled ? 'border-green-500 ring-1 ring-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{game.game_name}</h3>
                <p className="text-sm text-gray-600 font-medium">by {game.provider_name}</p>
              </div>
              <Badge variant={game.is_enabled ? 'success' : 'default'}>
                {game.is_enabled ? 'Active' : 'Available'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200/50">
              <div className="text-sm">
                <p className="text-gray-500">Cost per play</p>
                <p className="font-mono font-bold">${game.cost_per_play}</p>
              </div>
              
              <Button
                size="sm"
                variant={game.is_enabled ? 'danger' : 'primary'}
                onClick={() => handleToggle(game)}
              >
                {game.is_enabled ? 'Remove' : 'Add to Casino'}
              </Button>
            </div>
          </div>
        ))}
        {games.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No games available in the marketplace yet. Contact the Casino Owner.
          </div>
        )}
      </div>
    </div>
  );
};

export default GameMarketplace;