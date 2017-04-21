import React, { Component } from 'react';
import ReactCSSTransitionGroup from 'react/lib/ReactCSSTransitionGroup'
;
import FotoItem from './Foto';
import PubSub from 'pubsub-js';

export default class Timeline extends Component {
  constructor(props) {
    super();
    this.state = {fotos: []};
    this.login = props.login;
  }

  componentWillMount() {
    PubSub.subscribe('timeline-pesquisa', (topico, fotos) => this.setState({fotos}));

    PubSub.subscribe('foto-like', (evento, like) => {
      const fotoAchada = this.state.fotos.find(foto => foto.id === like.fotoId);
      fotoAchada.likeada = !fotoAchada.likeada;

      if (fotoAchada.likers.find(liker => liker.login === like.liker.login)) {
        fotoAchada.likers = fotoAchada.likers.filter(liker => liker.login !== like.liker.login);
      } else {
        fotoAchada.likers.push(like.liker);
      }

      this.setState({fotos: this.state.fotos});
    });

    PubSub.subscribe('foto-comentario', (topico, comentario) => {
      const fotoAchada = this.state.fotos.find(foto => foto.id === comentario.fotoId);
      fotoAchada.comentarios.push(comentario.comentario);
      this.setState({fotos: this.state.fotos});
    });
  }

  componentDidMount() {
    this.carregaFotos();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.login !== undefined) {
      this.login = nextProps.login;
      this.carregaFotos();
    }
  }

  carregaFotos() {
    let urlPerfil;

    if (this.login === undefined) {
      urlPerfil = `http://localhost:8080/api/fotos?X-AUTH-TOKEN=${localStorage.getItem('auth-token')}`;
    } else {
      urlPerfil = `http://localhost:8080/api/public/${this.login}`;
    }

    fetch(urlPerfil)
      .then(resposta => resposta.json())
      .then(fotos => this.setState({fotos}));
  }

  like(fotoId) {
    fetch(`http://localhost:8080/api/fotos/${fotoId}/like?X-AUTH-TOKEN=${localStorage.getItem('auth-token')}`, {method: 'POST'})
      .then(resposta => {
        if (resposta.ok) {
          return resposta.json();
        } else {
          throw new Error('Não foi possível likear a foto.');
        }
      })
      .then(liker => {
        PubSub.publish('foto-like', {fotoId, liker});
      });
  }

  comenta(fotoId, novoComentario) {
    const requestInfo = {
      method: 'POST',
      body: JSON.stringify(novoComentario),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };

    fetch(`http://localhost:8080/api/fotos/${fotoId}/comment?X-AUTH-TOKEN=${localStorage.getItem('auth-token')}`, requestInfo)
      .then(resposta => {
        if (resposta.ok) {
          return resposta.json();
        } else {
          throw new Error('Não foi possível comentar');
        }
      })
      .then(comentario => {
        PubSub.publish('foto-comentario', {fotoId, comentario});
      });
  }

  render() {
    return (
      <div className="fotos container">
        <ReactCSSTransitionGroup
          transitionName="timeline"
          transitionEnterTimeout={500}
          transitionLeaveTimeout={300}>
            {
              this.state.fotos.map(foto => {
                return <FotoItem key={foto.id} foto={foto} like={this.like} comenta={this.comenta}/>
              })
            }
        </ReactCSSTransitionGroup>
      </div>
    );
  }
}